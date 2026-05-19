import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendLiveSessionCreatedEmail } from '../utils/email';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { uploadFile, createSignedUploadUrl, getPublicUrl } from '../utils/s3';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
export const uploadMiddleware = upload.single('file');

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeScheduleTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '');
};

const sanitizeRoomName = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);

  return sanitized || `schedule-${randomUUID().slice(0, 8)}`;
};

const generateScheduleRoomName = (scheduleId?: string): string => {
  const suffix = scheduleId || randomUUID().slice(0, 10);
  return sanitizeRoomName(`schedule-${suffix}`);
};

const buildTenantFrontendUrl = (
  frontendUrl: string,
  subdomain: string | null | undefined,
  path: string
) => {
  try {
    const url = new URL(frontendUrl);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    if (subdomain) {
      if (
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1'
      ) {
        url.hostname = `${subdomain}.${url.hostname}`;
      } else if (!url.hostname.startsWith(`${subdomain}.`)) {
        url.hostname = `${subdomain}.${url.hostname}`;
      }
    }

    url.pathname = normalizedPath;
    url.search = '';

    return url.toString();
  } catch {
    return `${frontendUrl.replace(/\/+$/g, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }
};

const resolveScheduleRoomName = (schedule: { id: string; youtubeLink: string }): string => {
  const rawRoomName = schedule.youtubeLink?.trim();

  if (!rawRoomName || /^https?:\/\//i.test(rawRoomName)) {
    return generateScheduleRoomName(schedule.id);
  }

  return sanitizeRoomName(rawRoomName);
};

const serializeSchedule = <T extends { id: string; youtubeLink: string; tagsJson?: unknown }>(
  schedule: T
) => {
  const {
    youtubeLink,
    tagsJson,
    subjectId: _subjectId,
    topicId: _topicId,
    subjectName: _subjectName,
    ...rest
  } = schedule as T & {
    subjectId?: unknown;
    topicId?: unknown;
    subjectName?: unknown;
  };

  return {
    ...rest,
    batchId:
      'batchId' in rest && rest.batchId === null ? undefined : rest.batchId,
    teacherId:
      'teacherId' in rest && rest.teacherId === null ? undefined : rest.teacherId,
    thumbnailUrl:
      'thumbnailUrl' in rest && rest.thumbnailUrl === null
        ? undefined
        : rest.thumbnailUrl,
    notifyBeforeMinutes:
      'notifyBeforeMinutes' in rest && rest.notifyBeforeMinutes === null
        ? undefined
        : rest.notifyBeforeMinutes,
    roomName: resolveScheduleRoomName({ id: schedule.id, youtubeLink }),
    tags: normalizeScheduleTags(tagsJson),
  };
};

const buildStudentScheduleWhere = async (
  req: AuthRequest,
  where: Record<string, unknown>
): Promise<Record<string, unknown> | null> => {
  const organizationId = req.user?.organizationId;
  if (!organizationId) {
    return null;
  }

  if (req.user?.role !== 'STUDENT') {
    return {
      ...where,
      organizationId,
    };
  }

  const enrollments = await prisma.batchEnrollment.findMany({
    where: { userId: req.user.userId },
    select: { batchId: true },
  });

  const enrolledBatchIds = enrollments.map((enrollment) => enrollment.batchId);

  if (typeof where.batchId === 'string') {
    if (!enrolledBatchIds.includes(where.batchId)) {
      return null;
    }

    return {
      organizationId,
      ...where,
    };
  }

  return {
    organizationId,
    ...where,
    ...(typeof where.batchId === 'string'
      ? {}
      : {
          OR: [
            { audienceType: 'ORGANIZATION' },
            ...(enrolledBatchIds.length > 0
              ? [{ audienceType: 'COURSE', batchId: { in: enrolledBatchIds } }]
              : []),
          ],
        }),
  };
};

const createLiveKitJoinToken = ({
  apiKey,
  apiSecret,
  identity,
  name,
  roomName,
  metadata,
  isHost,
}: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  name: string;
  roomName: string;
  metadata: string;
  isHost: boolean;
}): string =>
  jwt.sign(
    {
      name,
      metadata,
      video: {
        room: roomName,
        roomJoin: true,
        roomAdmin: isHost,
        canPublish: isHost,
        canPublishData: true,
        canSubscribe: true,
        canUpdateOwnMetadata: true,
      },
    },
    apiSecret,
    {
      algorithm: 'HS256',
      issuer: apiKey,
      subject: identity,
      expiresIn: '2h',
    }
  );

const DEFAULT_WHITEBOARD_DATA = {
  version: 1,
  strokes: [],
  notes: [],
} as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeWhiteboardData = (value: unknown) => {
  if (!isPlainObject(value)) {
    return DEFAULT_WHITEBOARD_DATA;
  }

  const strokes = Array.isArray(value.strokes) ? value.strokes : [];
  const notes = Array.isArray(value.notes) ? value.notes : [];

  return {
    version: 1,
    strokes,
    notes,
  };
};

const ensureBatchReadAccess = async (
  req: AuthRequest,
  res: Response,
  batchId: string
): Promise<boolean> => {
  if (req.user?.role !== 'STUDENT') {
    return true;
  }

  const enrollment = await prisma.batchEnrollment.findUnique({
    where: {
      batchId_userId: {
        batchId,
        userId: req.user.userId,
      },
    },
  });

  if (!enrollment) {
    sendError(res, 'Enroll in this course to access its content', 403);
    return false;
  }

  return true;
};

const ensureScheduleReadAccess = async (
  req: AuthRequest,
  res: Response,
  schedule: {
    organizationId: string;
    batchId: string | null;
    audienceType?: 'ORGANIZATION' | 'COURSE';
  }
): Promise<boolean> => {
  if (schedule.organizationId !== req.user?.organizationId) {
    sendError(res, 'Live session not found', 404);
    return false;
  }

  if (!schedule.batchId || schedule.audienceType === 'ORGANIZATION') {
    return true;
  }

  return ensureBatchReadAccess(req, res, schedule.batchId);
};

const canEditScheduleWhiteboard = (
  req: AuthRequest,
  whiteboard: { isStudentEditingEnabled: boolean } | null
) => {
  if (req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER') {
    return true;
  }

  return !!whiteboard?.isStudentEditingEnabled;
};

type TopicQuizQuestionType = 'MCQ' | 'TRUE_FALSE';

type TopicQuizOption = {
  id: string;
  text: string;
};

type TopicQuizQuestion = {
  id: string;
  text: string;
  type: TopicQuizQuestionType;
  explanation?: string;
  options?: TopicQuizOption[];
  correctOptionId?: string;
};

type TopicQuiz = {
  title?: string;
  description?: string;
  passingPercentage: number;
  questions: TopicQuizQuestion[];
};

const TOPIC_QUIZ_TYPES: TopicQuizQuestionType[] = [
  'MCQ',
  'TRUE_FALSE',
];

const isTopicQuizQuestionType = (value: unknown): value is TopicQuizQuestionType =>
  typeof value === 'string' && TOPIC_QUIZ_TYPES.includes(value as TopicQuizQuestionType);

const sanitizeTopicQuizOption = (
  value: unknown,
  fallbackIndex: number
): TopicQuizOption | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const option = value as Record<string, unknown>;
  const text = typeof option.text === 'string' ? option.text.trim() : '';

  if (!text) {
    return null;
  }

  const id =
    typeof option.id === 'string' && option.id.trim() !== ''
      ? option.id.trim()
      : `opt-${fallbackIndex + 1}-${randomUUID().slice(0, 6)}`;

  return {
    id,
    text,
  };
};

const sanitizeTopicQuizQuestion = (
  value: unknown,
  fallbackIndex: number
): TopicQuizQuestion | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const question = value as Record<string, unknown>;
  const text = typeof question.text === 'string' ? question.text.trim() : '';
  const type = isTopicQuizQuestionType(question.type) ? question.type : 'MCQ';

  if (!text) {
    return null;
  }

  const id =
    typeof question.id === 'string' && question.id.trim() !== ''
      ? question.id.trim()
      : `quiz-q-${fallbackIndex + 1}-${randomUUID().slice(0, 6)}`;

  const sanitizedQuestion: TopicQuizQuestion = {
    id,
    text,
    type,
    explanation:
      typeof question.explanation === 'string' && question.explanation.trim() !== ''
        ? question.explanation.trim()
        : undefined,
  };

  if (type === 'MCQ' || type === 'TRUE_FALSE') {
    const rawOptions = Array.isArray(question.options) ? question.options : [];
    const options = rawOptions
      .map((option, index) => sanitizeTopicQuizOption(option, index))
      .filter((option): option is TopicQuizOption => Boolean(option));

    if (options.length < 2) {
      return null;
    }

    const correctOptionId =
      typeof question.correctOptionId === 'string' ? question.correctOptionId.trim() : '';

    if (!correctOptionId || !options.some((option) => option.id === correctOptionId)) {
      return null;
    }

    sanitizedQuestion.options = options;
    sanitizedQuestion.correctOptionId = correctOptionId;
    return sanitizedQuestion;
  }

  return null;
};

const sanitizeTopicQuiz = (value: unknown): TopicQuiz | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const quiz = value as Record<string, unknown>;
  const rawQuestions = Array.isArray(quiz.questions) ? quiz.questions : [];
  const questions = rawQuestions
    .map((question, index) => sanitizeTopicQuizQuestion(question, index))
    .filter((question): question is TopicQuizQuestion => Boolean(question));

  if (questions.length === 0) {
    return null;
  }

  const rawPassingPercentage =
    typeof quiz.passingPercentage === 'number'
      ? quiz.passingPercentage
      : Number(quiz.passingPercentage);

  const passingPercentage = Number.isFinite(rawPassingPercentage)
    ? Math.min(Math.max(rawPassingPercentage, 0), 100)
    : 70;

  return {
    title:
      typeof quiz.title === 'string' && quiz.title.trim() !== ''
        ? quiz.title.trim()
        : undefined,
    description:
      typeof quiz.description === 'string' && quiz.description.trim() !== ''
        ? quiz.description.trim()
        : undefined,
    passingPercentage,
    questions,
  };
};

const serializeTopicQuizForAuthoring = (value: unknown) => sanitizeTopicQuiz(value);

const serializeTopicQuizForStudent = (value: unknown) => {
  const quiz = sanitizeTopicQuiz(value);

  if (!quiz) {
    return null;
  }

  return {
    title: quiz.title,
    description: quiz.description,
    passingPercentage: quiz.passingPercentage,
    questions: quiz.questions.map((question) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      explanation: question.explanation,
      options: question.options,
    })),
  };
};

const serializeTopicQuizAttempt = (
  attempt:
    | {
        id: string;
        attemptNumber: number;
        score: number;
        percentage: number;
        correctCount: number;
        totalQuestions: number;
        isPassed: boolean;
        completedAt: Date;
      }
    | null
    | undefined
) => {
  if (!attempt) {
    return null;
  }

  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    score: attempt.score,
    percentage: attempt.percentage,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    isPassed: attempt.isPassed,
    completedAt: attempt.completedAt,
  };
};

const serializeTopicRecord = <
  T extends {
    quizJson?: unknown;
    assignments?: unknown;
    quizAttempts?: Array<{
      id: string;
      attemptNumber: number;
      score: number;
      percentage: number;
      correctCount: number;
      totalQuestions: number;
      isPassed: boolean;
      completedAt: Date;
    }>;
  },
>(
  topic: T,
  role?: string
) => {
  const { quizJson, assignments, quizAttempts, ...rest } = topic;

  return {
    ...rest,
    assignments: Array.isArray(assignments) ? assignments : [],
    quiz: null,
    latestQuizAttempt:
      role === 'STUDENT' ? serializeTopicQuizAttempt(quizAttempts?.[0]) : null,
  };
};

const evaluateTopicQuizSubmission = (
  quiz: TopicQuiz,
  answers: Record<string, unknown>
) => {
  let correctCount = 0;

  quiz.questions.forEach((question) => {
    const answer = answers[question.id];

    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
      if (typeof answer === 'string' && answer === question.correctOptionId) {
        correctCount += 1;
      }
    }
  });

  const totalQuestions = quiz.questions.length;
  const percentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  return {
    totalQuestions,
    correctCount,
    score: correctCount,
    percentage,
    isPassed: percentage >= quiz.passingPercentage,
  };
};

// ── Profile ───────────────────────────────────────────────

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { sendError(res, 'User not found', 404); return; }
    sendSuccess(res, { id: user.id, email: user.email, username: user.username, role: user.role, organizationId: user.organizationId, isVerified: user.isVerified, profileImg: user.profileImg, gender: user.gender, phoneNumber: user.phoneNumber, address: { city: user.addressCity, state: user.addressState, pincode: user.addressPincode } });
  } catch (e) { next(e); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, profileImg, gender, phoneNumber, address } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { username, profileImg, gender, phoneNumber, addressCity: address?.city, addressState: address?.state, addressPincode: address?.pincode },
    });
    sendSuccess(res, user);
  } catch (e) { next(e); }
};

// ── Users (Admin) ─────────────────────────────────────────

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({ where: { organizationId: req.user!.organizationId }, select: { id: true, email: true, username: true, role: true, isVerified: true, createdAt: true } });
    sendSuccess(res, users);
  } catch (e) { next(e); }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.user.deleteMany({ where: { id: req.params.userId, organizationId: req.user!.organizationId } });
    sendSuccess(res, { message: 'User deleted' });
  } catch (e) { next(e); }
};

// ── Teachers (Admin) ──────────────────────────────────────

export const createTeacher = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, batchIds, highlights } = req.body;
    const teacher = await prisma.teacher.create({
      data: { organizationId: req.user!.organizationId, name, highlightsJson: highlights || {}, batchTeachers: batchIds ? { create: (batchIds as string[]).map((batchId: string) => ({ batchId })) } : undefined },
      include: { batchTeachers: true },
    });
    sendSuccess(res, teacher, undefined, 201);
  } catch (e) { next(e); }
};

export const listTeachers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teachers = await prisma.teacher.findMany({ where: { organizationId: req.user!.organizationId }, include: { batchTeachers: { include: { batch: { select: { id: true, name: true } } } } } });
    sendSuccess(res, teachers);
  } catch (e) { next(e); }
};

export const getTeachersByBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teachers = await prisma.teacher.findMany({ where: { organizationId: req.user!.organizationId, batchTeachers: { some: { batchId: req.params.batchId } } } });
    sendSuccess(res, teachers);
  } catch (e) { next(e); }
};

export const updateTeacher = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, highlights } = req.body;
    const t = await prisma.teacher.updateMany({ where: { id: req.params.id, organizationId: req.user!.organizationId }, data: { name, highlightsJson: highlights } });
    if (!t.count) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, { message: 'Updated' });
  } catch (e) { next(e); }
};

export const deleteTeacher = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.teacher.deleteMany({ where: { id: req.params.id, organizationId: req.user!.organizationId } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

export const assignTeacherToBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.batchTeacher.create({ data: { teacherId: req.params.teacherId, batchId: req.params.batchId } });
    sendSuccess(res, { message: 'Teacher assigned' });
  } catch (e) { next(e); }
};

export const removeTeacherFromBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.batchTeacher.delete({ where: { batchId_teacherId: { teacherId: req.params.teacherId, batchId: req.params.batchId } } });
    sendSuccess(res, { message: 'Teacher removed' });
  } catch (e) { next(e); }
};

// ── Subjects ──────────────────────────────────────────────

export const createSubject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const s = await prisma.subject.create({ data: req.body });
    sendSuccess(res, s, undefined, 201);
  } catch (e) { next(e); }
};

export const listSubjectsByBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await ensureBatchReadAccess(req, res, req.params.batchId))) return;
    const subjects = await prisma.subject.findMany({ where: { batchId: req.params.batchId }, include: { _count: { select: { chapters: true } } }, orderBy: { order: 'asc' } });
    sendSuccess(res, subjects);
  } catch (e) { next(e); }
};

export const listChaptersByBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await ensureBatchReadAccess(req, res, req.params.batchId))) return;

    const subjects = await prisma.subject.findMany({
      where: { batchId: req.params.batchId },
      orderBy: { order: 'asc' },
      include: {
        chapters: {
          include: {
            _count: {
              select: { topics: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    sendSuccess(
      res,
      subjects.flatMap((subject) =>
        subject.chapters.map((chapter) => ({
          ...chapter,
          legacySubjectId: subject.id,
          legacySubjectName: subject.name,
          batchId: subject.batchId,
        }))
      )
    );
  } catch (e) { next(e); }
};

export const getCourseHierarchyByBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role === 'STUDENT') {
      const enrollment = await prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: {
            batchId: req.params.batchId,
            userId: req.user.userId,
          },
        },
      });

      if (!enrollment) {
        const batch = await prisma.batch.findUnique({
          where: { id: req.params.batchId },
          select: { status: true },
        });

        if (!batch || batch.status !== 'ACTIVE') {
          sendError(res, 'Enroll in this course to access its content', 403);
          return;
        }
      }
    } else if (!(await ensureBatchReadAccess(req, res, req.params.batchId))) {
      return;
    }

    const subjects = await prisma.subject.findMany({
      where: { batchId: req.params.batchId },
      orderBy: { order: 'asc' },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            topics: {
              orderBy: { order: 'asc' },
              include: {
                contents: {
                  orderBy: { order: 'asc' },
                },
                assignments: {
                  where: req.user?.role === 'STUDENT' ? { status: 'PUBLISHED' } : undefined,
                  orderBy: { order: 'asc' },
                  include: {
                    _count: { select: { questions: true, submissions: true } },
                  },
                },
                quizAttempts:
                  req.user?.role === 'STUDENT'
                    ? {
                        where: { userId: req.user.userId },
                        orderBy: { completedAt: 'desc' },
                        take: 1,
                      }
                    : false,
              },
            },
          },
        },
      },
    });
    sendSuccess(
      res,
      subjects.map((subject) => ({
        ...subject,
        chapters: subject.chapters.map((chapter) => ({
          ...chapter,
          topics: chapter.topics.map((topic) =>
            serializeTopicRecord(topic, req.user?.role)
          ),
        })),
      }))
    );
  } catch (e) { next(e); }
};

export const getCourseOutlineByBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role === 'STUDENT') {
      const enrollment = await prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: {
            batchId: req.params.batchId,
            userId: req.user.userId,
          },
        },
      });

      if (!enrollment) {
        const batch = await prisma.batch.findUnique({
          where: { id: req.params.batchId },
          select: { status: true },
        });

        if (!batch || batch.status !== 'ACTIVE') {
          sendError(res, 'Enroll in this course to access its content', 403);
          return;
        }
      }
    } else if (!(await ensureBatchReadAccess(req, res, req.params.batchId))) {
      return;
    }

    const subjects = await prisma.subject.findMany({
      where: { batchId: req.params.batchId },
      orderBy: { order: 'asc' },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: {
            topics: {
              orderBy: { order: 'asc' },
              include: {
                contents: {
                  orderBy: { order: 'asc' },
                },
                assignments: {
                  where: req.user?.role === 'STUDENT' ? { status: 'PUBLISHED' } : undefined,
                  orderBy: { order: 'asc' },
                  include: {
                    _count: { select: { questions: true, submissions: true } },
                  },
                },
                quizAttempts:
                  req.user?.role === 'STUDENT'
                    ? {
                        where: { userId: req.user.userId },
                        orderBy: { completedAt: 'desc' },
                        take: 1,
                      }
                    : false,
              },
            },
          },
        },
      },
    });

    sendSuccess(
      res,
      subjects.flatMap((subject) =>
        subject.chapters.map((chapter) => ({
          ...chapter,
          batchId: subject.batchId,
          legacySubjectId: subject.id,
          legacySubjectName: subject.name,
          topics: chapter.topics.map((topic) =>
            serializeTopicRecord(topic, req.user?.role)
          ),
        }))
      )
    );
  } catch (e) { next(e); }
};

export const getSubject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const s = await prisma.subject.findUnique({ where: { id: req.params.id } });
    if (!s) { sendError(res, 'Not found', 404); return; }
    if (!(await ensureBatchReadAccess(req, res, s.batchId))) return;
    sendSuccess(res, s);
  } catch (e) { next(e); }
};

export const updateSubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const s = await prisma.subject.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, s);
  } catch (e) { next(e); }
};

export const deleteSubject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.subject.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

// ── Chapters ──────────────────────────────────────────────

export const createChapter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, subjectId, batchId, order } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      sendError(res, 'Chapter name is required', 400);
      return;
    }

    let resolvedSubjectId = typeof subjectId === 'string' && subjectId.trim() !== ''
      ? subjectId
      : undefined;

    if (resolvedSubjectId) {
      const subject = await prisma.subject.findUnique({
        where: { id: resolvedSubjectId },
        select: { batchId: true },
      });

      if (!subject) {
        sendError(res, 'Chapter container not found', 404);
        return;
      }

      if (!(await ensureBatchReadAccess(req, res, subject.batchId))) return;
    } else {
      if (!batchId || typeof batchId !== 'string') {
        sendError(res, 'Course is required to create a chapter', 400);
        return;
      }

      if (!(await ensureBatchReadAccess(req, res, batchId))) return;

      const subject =
        (await prisma.subject.findFirst({
          where: { batchId },
          orderBy: { order: 'asc' },
          select: { id: true },
        })) ||
        (await prisma.subject.create({
          data: {
            batchId,
            name: 'Course Content',
            order: 0,
          },
          select: { id: true },
        }));

      resolvedSubjectId = subject.id;
    }

    if (!resolvedSubjectId) {
      sendError(res, 'Chapter container could not be resolved', 400);
      return;
    }

    const c = await prisma.chapter.create({
      data: {
        name: name.trim(),
        subjectId: resolvedSubjectId,
        order: Number.isFinite(Number(order)) ? Number(order) : 0,
      },
    });
    sendSuccess(res, c, undefined, 201);
  } catch (e) { next(e); }
};

export const listChaptersBySubject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subject = await prisma.subject.findUnique({ where: { id: req.params.subjectId }, select: { batchId: true } });
    if (!subject) { sendError(res, 'Subject not found', 404); return; }
    if (!(await ensureBatchReadAccess(req, res, subject.batchId))) return;
    const chapters = await prisma.chapter.findMany({ where: { subjectId: req.params.subjectId }, include: { _count: { select: { topics: true } } }, orderBy: { order: 'asc' } });
    sendSuccess(res, chapters);
  } catch (e) { next(e); }
};

export const getChapter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const c = await prisma.chapter.findUnique({
      where: { id: req.params.id },
      include: {
        topics: { include: { _count: { select: { contents: true } } } },
        subject: { select: { batchId: true } },
      },
    });
    if (!c) { sendError(res, 'Not found', 404); return; }
    if (!(await ensureBatchReadAccess(req, res, c.subject.batchId))) return;
    sendSuccess(res, c);
  } catch (e) { next(e); }
};

export const updateChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const c = await prisma.chapter.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, c);
  } catch (e) { next(e); }
};

export const deleteChapter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.chapter.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

// ── Topics ────────────────────────────────────────────────

export const createTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t = await prisma.topic.create({ data: req.body });
    sendSuccess(res, t, undefined, 201);
  } catch (e) { next(e); }
};

export const listTopicsByChapter = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: req.params.chapterId },
      include: { subject: { select: { batchId: true } } },
    });
    if (!chapter) { sendError(res, 'Chapter not found', 404); return; }
    if (!(await ensureBatchReadAccess(req, res, chapter.subject.batchId))) return;
    const topics = await prisma.topic.findMany({ where: { chapterId: req.params.chapterId }, include: { _count: { select: { contents: true } } }, orderBy: { order: 'asc' } });
    sendSuccess(res, topics);
  } catch (e) { next(e); }
};

export const getTopic = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: {
        contents: { orderBy: { order: 'asc' } },
        assignments: {
          where: req.user?.role === 'STUDENT' ? { status: 'PUBLISHED' } : undefined,
          orderBy: { order: 'asc' },
          include: {
            _count: { select: { questions: true, submissions: true } },
          },
        },
        quizAttempts:
          req.user?.role === 'STUDENT'
            ? {
                where: { userId: req.user.userId },
                orderBy: { completedAt: 'desc' },
                take: 1,
              }
            : false,
        chapter: { include: { subject: { select: { batchId: true } } } },
      },
    });
    if (!t) { sendError(res, 'Not found', 404); return; }
    if (!(await ensureBatchReadAccess(req, res, t.chapter.subject.batchId))) return;
    sendSuccess(res, serializeTopicRecord(t, req.user?.role));
  } catch (e) { next(e); }
};

export const updateTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const t = await prisma.topic.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, t);
  } catch (e) { next(e); }
};

export const updateTopicQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: {
        chapter: {
          include: {
            subject: {
              select: { batchId: true },
            },
          },
        },
      },
    });

    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    if (!(await ensureBatchReadAccess(req, res, topic.chapter.subject.batchId))) return;

    const sanitizedQuiz = sanitizeTopicQuiz(req.body?.quiz ?? req.body);

    if (!sanitizedQuiz) {
      sendError(res, 'Add at least one valid quiz question before saving', 400);
      return;
    }

    const updatedTopic = await prisma.topic.update({
      where: { id: req.params.id },
      data: { quizJson: sanitizedQuiz },
    });

    sendSuccess(res, {
      ...updatedTopic,
      quiz: serializeTopicQuizForAuthoring(updatedTopic.quizJson),
    });
  } catch (e) { next(e); }
};

export const deleteTopicQuiz = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: {
        chapter: {
          include: {
            subject: {
              select: { batchId: true },
            },
          },
        },
      },
    });

    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    if (!(await ensureBatchReadAccess(req, res, topic.chapter.subject.batchId))) return;

    await prisma.topic.update({
      where: { id: req.params.id },
      data: { quizJson: Prisma.JsonNull },
    });

    sendSuccess(res, { message: 'Topic quiz deleted' });
  } catch (e) { next(e); }
};

export const submitTopicQuizAttempt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.id },
      include: {
        chapter: {
          include: {
            subject: {
              select: { batchId: true },
            },
          },
        },
      },
    });

    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    if (!(await ensureBatchReadAccess(req, res, topic.chapter.subject.batchId))) return;

    const quiz = sanitizeTopicQuiz(topic.quizJson);

    if (!quiz) {
      sendError(res, 'This topic does not have a quiz yet', 404);
      return;
    }

    const answers =
      req.body?.answers && typeof req.body.answers === 'object' && !Array.isArray(req.body.answers)
        ? (req.body.answers as Record<string, unknown>)
        : {};

    const result = evaluateTopicQuizSubmission(quiz, answers);
    const attemptCount = await prisma.topicQuizAttempt.count({
      where: { topicId: topic.id, userId },
    });

    const attempt = await prisma.topicQuizAttempt.create({
      data: {
        topicId: topic.id,
        userId,
        attemptNumber: attemptCount + 1,
        answersJson: answers as Prisma.InputJsonValue,
        score: result.score,
        percentage: result.percentage,
        correctCount: result.correctCount,
        totalQuestions: result.totalQuestions,
        isPassed: result.isPassed,
      },
    });

    sendSuccess(res, {
      topicId: topic.id,
      passingPercentage: quiz.passingPercentage,
      attempt: serializeTopicQuizAttempt(attempt),
    }, 'Quiz submitted successfully', 201);
  } catch (e) { next(e); }
};

export const deleteTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.topic.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

// ── Schedules ─────────────────────────────────────────────

export const createSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tags, roomName, youtubeLink, ...rest } = req.body;
    const audienceType =
      rest.audienceType === 'ORGANIZATION' ? 'ORGANIZATION' : 'COURSE';
    const organizationId = req.user!.organizationId;

    let batchId: string | undefined;
    let batchName: string | undefined;

    if (audienceType === 'COURSE') {
      if (typeof rest.batchId !== 'string' || rest.batchId.trim() === '') {
        sendError(res, 'batchId is required for course live sessions', 400);
        return;
      }

      batchId = rest.batchId.trim();

      const batch = await prisma.batch.findFirst({
        where: { id: batchId, organizationId },
        select: { id: true, name: true },
      });

      if (!batch) {
        sendError(res, 'Course not found', 404);
        return;
      }
      batchName = batch.name;
    }

    const teacherId = normalizeOptionalString(rest.teacherId);

    if (teacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: { id: teacherId, organizationId },
        select: { id: true },
      });

      if (!teacher) {
        sendError(res, 'Selected teacher was not found in this organization', 400);
        return;
      }
    }

    const generatedRoomName = sanitizeRoomName(
      typeof roomName === 'string' && roomName.trim() !== ''
        ? roomName
        : `schedule-${randomUUID().slice(0, 10)}`
    );

    const schedule = await prisma.schedule.create({
      data: {
        title: rest.title,
        description: rest.description,
        scheduledAt: rest.scheduledAt,
        duration: rest.duration,
        teacherId,
        thumbnailUrl: rest.thumbnailUrl,
        notifyBeforeMinutes: rest.notifyBeforeMinutes,
        organizationId,
        audienceType,
        batchId,
        tagsJson: normalizeScheduleTags(tags),
        youtubeLink:
          typeof youtubeLink === 'string' && youtubeLink.trim() !== ''
            ? sanitizeRoomName(youtubeLink)
            : generatedRoomName,
      },
    });

    try {
      const recipients =
        audienceType === 'COURSE' && batchId
          ? await prisma.batchEnrollment.findMany({
              where: { batchId },
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            })
          : await prisma.user.findMany({
              where: {
                organizationId,
                role: 'STUDENT',
              },
              select: {
                email: true,
              },
            });

      const uniqueRecipients = Array.from(
        new Set(
          recipients
            .map((recipient) =>
              'user' in recipient ? recipient.user?.email : recipient.email
            )
            .filter((email): email is string => typeof email === 'string' && email.trim() !== '')
            .map((email) => email.trim().toLowerCase())
        )
      );

      if (uniqueRecipients.length > 0) {
        const organization = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { subdomain: true },
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = buildTenantFrontendUrl(
          frontendUrl,
          organization?.subdomain,
          batchId
            ? `/student/batches/${batchId}/schedule/${schedule.id}`
            : `/student/live-sessions/${schedule.id}`
        );

        await sendLiveSessionCreatedEmail({
          organizationId,
          recipients: uniqueRecipients,
          title: schedule.title,
          description: normalizeOptionalString(schedule.description),
          scheduledAt: schedule.scheduledAt,
          duration: schedule.duration,
          courseName: batchName,
          actionUrl,
        });
      }
    } catch (notificationError) {
      logger.warn(
        `Live session created but email notification failed for session ${schedule.id}: ${
          notificationError instanceof Error
            ? notificationError.message
            : 'unknown error'
        }`
      );
    }

    sendSuccess(res, serializeSchedule(schedule), undefined, 201);
  } catch (e) { next(e); }
};

export const listSchedules = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, batchId, teacherId, upcoming } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (teacherId) where.teacherId = teacherId;
    if (upcoming === 'true') where.scheduledAt = { gte: new Date() };

    const scopedWhere = await buildStudentScheduleWhere(req, where);

    if (!scopedWhere) {
      sendError(res, 'Enroll in this course to access its live sessions', 403);
      return;
    }

    const [schedules, total] = await Promise.all([
      prisma.schedule.findMany({
        where: scopedWhere,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.schedule.count({ where: scopedWhere }),
    ]);

    sendSuccess(res, {
      data: schedules.map(serializeSchedule),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (e) { next(e); }
};

export const getSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;
    sendSuccess(res, serializeSchedule(schedule));
  } catch (e) { next(e); }
};

export const updateSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.user!.organizationId) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    const { tags, roomName, youtubeLink, ...rest } = req.body;
    const teacherId = normalizeOptionalString(rest.teacherId);

    if (teacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: { id: teacherId, organizationId: req.user!.organizationId },
        select: { id: true },
      });

      if (!teacher) {
        sendError(res, 'Selected teacher was not found in this organization', 400);
        return;
      }
    }

    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: {
        ...(typeof rest.title === 'string' ? { title: rest.title } : {}),
        ...(typeof rest.description === 'string' || rest.description === null
          ? { description: rest.description }
          : {}),
        ...(rest.scheduledAt ? { scheduledAt: rest.scheduledAt } : {}),
        ...(typeof rest.duration === 'number' ? { duration: rest.duration } : {}),
        ...(typeof rest.teacherId === 'string'
          ? { teacherId }
          : rest.teacherId === null
          ? { teacherId: null }
          : {}),
        ...(typeof rest.thumbnailUrl === 'string' || rest.thumbnailUrl === null
          ? { thumbnailUrl: rest.thumbnailUrl }
          : {}),
        ...(typeof rest.notifyBeforeMinutes === 'number' ||
        rest.notifyBeforeMinutes === null
          ? { notifyBeforeMinutes: rest.notifyBeforeMinutes }
          : {}),
        ...(typeof roomName === 'string' && roomName.trim() !== ''
          ? { youtubeLink: sanitizeRoomName(roomName) }
          : {}),
        ...(typeof youtubeLink === 'string' && youtubeLink.trim() !== ''
          ? { youtubeLink: sanitizeRoomName(youtubeLink) }
          : {}),
        ...(tags ? { tagsJson: normalizeScheduleTags(tags) } : {}),
      },
    });

    sendSuccess(res, serializeSchedule(schedule));
  } catch (e) { next(e); }
};

export const updateScheduleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== authReq.user!.organizationId) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    const schedule = await prisma.schedule.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    sendSuccess(res, serializeSchedule(schedule));
  } catch (e) { next(e); }
};

export const deleteSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.user!.organizationId) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    await prisma.schedule.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

export const getSchedulesByBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await ensureBatchReadAccess(req, res, req.params.batchId))) return;
    const schedules = await prisma.schedule.findMany({
      where: {
        organizationId: req.user!.organizationId,
        batchId: req.params.batchId,
      },
      orderBy: { scheduledAt: 'asc' },
    });
    sendSuccess(res, { data: schedules.map(serializeSchedule) });
  } catch (e) { next(e); }
};

export const getSchedulesByTopic = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.topicId },
      include: {
        chapter: {
          include: {
            subject: {
              select: { batchId: true },
            },
          },
        },
      },
    });

    if (!topic) {
      sendError(res, 'Topic not found', 404);
      return;
    }

    if (!(await ensureBatchReadAccess(req, res, topic.chapter.subject.batchId))) return;
    const schedules = await prisma.schedule.findMany({
      where: {
        organizationId: req.user!.organizationId,
        topicId: req.params.topicId,
      },
      orderBy: { scheduledAt: 'asc' },
    });
    sendSuccess(res, { data: schedules.map(serializeSchedule) });
  } catch (e) { next(e); }
};

export const getScheduleJoinToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      sendError(res, 'LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.', 500);
      return;
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.id },
      include: {
        batch: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    if (!schedule) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, username: true, email: true, role: true },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isHost = req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER';
    const roomName = resolveScheduleRoomName(schedule);
    const participantName = user.username || user.email || 'Participant';
    const identity = `${isHost ? 'host' : 'student'}-${user.id}`;
    const metadata = JSON.stringify({
      scheduleId: schedule.id,
      batchId: schedule.batchId,
      batchName: schedule.batch?.name ?? null,
      role: user.role,
      userId: user.id,
    });

    const token = createLiveKitJoinToken({
      apiKey: livekitApiKey,
      apiSecret: livekitApiSecret,
      identity,
      name: participantName,
      roomName,
      metadata,
      isHost,
    });

    sendSuccess(res, {
      token,
      serverUrl: livekitUrl,
      roomName,
      identity,
      participantName,
      canPublish: isHost,
      schedule: serializeSchedule(schedule),
    });
  } catch (e) { next(e); }
};

export const getScheduleWhiteboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.id },
      include: { whiteboard: true },
    });

    if (!schedule) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;

    const whiteboard = schedule.whiteboard;

    sendSuccess(res, {
      id: whiteboard?.id,
      scheduleId: schedule.id,
      data: normalizeWhiteboardData(whiteboard?.dataJson),
      isStudentEditingEnabled: whiteboard?.isStudentEditingEnabled ?? false,
      permissions: {
        canEdit: canEditScheduleWhiteboard(req, whiteboard ?? null),
        canManageSettings: req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER',
      },
      updatedAt: whiteboard?.updatedAt ?? null,
    });
  } catch (e) { next(e); }
};

export const updateScheduleWhiteboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.id },
      include: { whiteboard: true },
    });

    if (!schedule) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;

    const canManageSettings = req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER';
    const canEdit = canEditScheduleWhiteboard(req, schedule.whiteboard ?? null);
    const wantsToChangeBoard =
      Object.prototype.hasOwnProperty.call(req.body, 'data') ||
      Object.prototype.hasOwnProperty.call(req.body, 'boardData');
    const wantsToChangeStudentEditing = Object.prototype.hasOwnProperty.call(
      req.body,
      'isStudentEditingEnabled'
    );

    if (wantsToChangeBoard && !canEdit) {
      sendError(res, 'You do not have permission to edit this whiteboard', 403);
      return;
    }

    if (wantsToChangeStudentEditing && !canManageSettings) {
      sendError(res, 'You do not have permission to change whiteboard settings', 403);
      return;
    }

    const boardDataSource = Object.prototype.hasOwnProperty.call(req.body, 'data')
      ? req.body.data
      : req.body.boardData;

    const updated = await prisma.scheduleWhiteboard.upsert({
      where: { scheduleId: schedule.id },
      create: {
        scheduleId: schedule.id,
        organizationId: schedule.organizationId,
        dataJson: wantsToChangeBoard
          ? normalizeWhiteboardData(boardDataSource)
          : DEFAULT_WHITEBOARD_DATA,
        isStudentEditingEnabled:
          wantsToChangeStudentEditing && typeof req.body.isStudentEditingEnabled === 'boolean'
            ? req.body.isStudentEditingEnabled
            : false,
      },
      update: {
        ...(wantsToChangeBoard
          ? { dataJson: normalizeWhiteboardData(boardDataSource) }
          : {}),
        ...(wantsToChangeStudentEditing &&
        typeof req.body.isStudentEditingEnabled === 'boolean'
          ? { isStudentEditingEnabled: req.body.isStudentEditingEnabled }
          : {}),
      },
    });

    sendSuccess(res, {
      id: updated.id,
      scheduleId: schedule.id,
      data: normalizeWhiteboardData(updated.dataJson),
      isStudentEditingEnabled: updated.isStudentEditingEnabled,
      permissions: {
        canEdit: canEditScheduleWhiteboard(req, updated),
        canManageSettings,
      },
      updatedAt: updated.updatedAt,
    });
  } catch (e) { next(e); }
};

// ── Orders ────────────────────────────────────────────────

export const getOrderHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const where = { userId, ...(req.query.status ? { paymentStatus: req.query.status } : {}) };
    const [orders, total] = await Promise.all([prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }), prisma.order.count({ where })]);
    sendSuccess(res, { data: orders, pagination: { currentPage: page, totalPages: Math.ceil(total / limit), totalCount: total, limit, hasNextPage: page < Math.ceil(total / limit), hasPreviousPage: page > 1 } });
  } catch (e) { next(e); }
};

// ── Upload ────────────────────────────────────────────────

export const getSignedUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Left for backwards compatibility if still called, but normally not needed
    sendError(res, 'Direct upload is used via Supabase.', 400); 
  } catch (e) { next(e); }
};

export const directUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) { sendError(res, 'No file provided', 400); return; }
    const folder = (req.body.folder as string) || 'uploads';
    
    // Upload buffer to Supabase
    const result = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, folder);
    
    sendSuccess(res, { key: result.key, url: result.publicUrl, bucket: 'supabase', originalName: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype });
  } catch (e) { next(e); }
};

export const initiateMultipart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fileName, folder } = req.body;
    if (!fileName) { sendError(res, 'File name is required', 400); return; }
    
    const result = await createSignedUploadUrl(fileName, folder || 'uploads');
    sendSuccess(res, {
      uploadId: result.key,
      key: result.key,
      bucket: 'supabase',
      signedUrl: result.signedUrl,
    });
  } catch (e) { next(e); }
};

export const getMultipartUrls = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.body;
    if (!key) { sendError(res, 'Key is required', 400); return; }
    
    const publicUrl = getPublicUrl(key);
    sendSuccess(res, {
      urls: [{ partNumber: 1, uploadUrl: publicUrl }],
      expiresIn: 3600,
    });
  } catch (e) { next(e); }
};

export const completeMultipart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.body;
    if (!key) { sendError(res, 'Key is required', 400); return; }
    
    const publicUrl = getPublicUrl(key);
    sendSuccess(res, {
      key,
      publicUrl,
      cdnUrl: publicUrl,
      bucket: 'supabase',
    });
  } catch (e) { next(e); }
};
