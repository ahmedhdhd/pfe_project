import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { sendAssignmentResultEmail } from '../utils/email';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const QUESTION_TYPES = ['QUIZ', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILE_SUBMISSION'] as const;
type AssignmentQuestionType = (typeof QUESTION_TYPES)[number];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const optionalString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value.trim() : undefined;

const optionalDate = (value: unknown): Date | undefined => {
  const raw = optionalString(value);
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeQuestionType = (value: unknown): AssignmentQuestionType =>
  QUESTION_TYPES.includes(value as AssignmentQuestionType)
    ? (value as AssignmentQuestionType)
    : 'QUIZ';

const normalizeJsonArray = (value: unknown) => (Array.isArray(value) ? value : []);
const normalizeJsonObject = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value : {};

const ensureBatchAccess = async (req: AuthRequest, res: Response, batchId: string) => {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, organizationId: req.user!.organizationId },
    select: { id: true, name: true, organizationId: true },
  });

  if (!batch) {
    sendError(res, 'Course not found', 404);
    return null;
  }

  return batch;
};

const ensureAssignmentAccess = async (req: AuthRequest, res: Response, assignmentId: string) => {
  const assignment = await (prisma as any).assignment.findFirst({
    where: { id: assignmentId, organizationId: req.user!.organizationId },
    include: {
      batch: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
    },
  });

  if (!assignment) {
    sendError(res, 'Assignment not found', 404);
    return null;
  }

  return assignment;
};

const ensureStudentAssignmentAccess = async (
  req: AuthRequest,
  res: Response,
  assignmentId: string
) => {
  const assignment = await (prisma as any).assignment.findFirst({
    where: {
      id: assignmentId,
      organizationId: req.user!.organizationId,
      status: 'PUBLISHED',
    },
    include: {
      batch: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!assignment) {
    sendError(res, 'Assignment not found', 404);
    return null;
  }

  const enrollment = await prisma.batchEnrollment.findUnique({
    where: {
      batchId_userId: {
        batchId: assignment.batchId,
        userId: req.user!.userId,
      },
    },
  });

  if (!enrollment) {
    sendError(res, 'Enroll in this course to access this assignment', 403);
    return null;
  }

  return assignment;
};

const serializeStudentQuestion = (question: any) => ({
  id: question.id,
  assignmentId: question.assignmentId,
  type: question.type,
  title: question.title,
  prompt: question.prompt,
  options: normalizeJsonArray(question.optionsJson),
  points: question.points,
  order: question.order,
});

const buildStudentPortalUrl = (slug: string | null | undefined, path: string) => {
  if (!slug) {
    return `${FRONTEND_URL}${path}`;
  }

  return `${FRONTEND_URL.replace(/(https?:\/\/)/, `$1${slug}.`)}${path}`;
};

export const createAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batchId = optionalString(req.body?.batchId);
    const title = optionalString(req.body?.title);

    if (!batchId) {
      sendError(res, 'batchId is required', 400);
      return;
    }
    if (!title) {
      sendError(res, 'title is required', 400);
      return;
    }

    const batch = await ensureBatchAccess(req, res, batchId);
    if (!batch) return;

    const topicId = optionalString(req.body?.topicId);
    if (topicId) {
      const topic = await prisma.topic.findFirst({
        where: { id: topicId, chapter: { subject: { batchId } } },
        select: { id: true },
      });
      if (!topic) {
        sendError(res, 'Topic not found for this course', 404);
        return;
      }
    }

    const lastAssignment = await (prisma as any).assignment.findFirst({
      where: { batchId, ...(topicId ? { topicId } : {}) },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const assignment = await (prisma as any).assignment.create({
      data: {
        organizationId: req.user!.organizationId,
        batchId,
        topicId: topicId || null,
        createdByUserId: req.user!.userId,
        title,
        description: optionalString(req.body?.description) || null,
        status: req.body?.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        dueAt: optionalDate(req.body?.dueAt) || null,
        order: (lastAssignment?.order ?? -1) + 1,
      },
      include: {
        batch: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        _count: { select: { questions: true, submissions: true } },
      },
    });

    sendSuccess(res, assignment, undefined, 201);
  } catch (e) {
    next(e);
  }
};

export const listAssignments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batchId = optionalString(req.query?.batchId);
    const topicId = optionalString(req.query?.topicId);

    const assignments = await (prisma as any).assignment.findMany({
      where: {
        organizationId: req.user!.organizationId,
        ...(batchId ? { batchId } : {}),
        ...(topicId ? { topicId } : {}),
      },
      include: {
        batch: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        _count: { select: { questions: true, submissions: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    sendSuccess(res, assignments);
  } catch (e) {
    next(e);
  }
};

export const getAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureAssignmentAccess(req, res, req.params.id);
    if (!assignment) return;

    const fullAssignment = await (prisma as any).assignment.findUnique({
      where: { id: assignment.id },
      include: {
        batch: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true, submissions: true } },
      },
    });

    sendSuccess(res, fullAssignment);
  } catch (e) {
    next(e);
  }
};

export const updateAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureAssignmentAccess(req, res, req.params.id);
    if (!assignment) return;

    const data: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      const title = optionalString(req.body?.title);
      if (!title) {
        sendError(res, 'title cannot be empty', 400);
        return;
      }
      data.title = title;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
      data.description = optionalString(req.body?.description) || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      data.status = ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(req.body?.status)
        ? req.body.status
        : assignment.status;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'dueAt')) {
      data.dueAt = optionalDate(req.body?.dueAt) || null;
    }

    const updated = await (prisma as any).assignment.update({
      where: { id: assignment.id },
      data,
      include: {
        batch: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true, submissions: true } },
      },
    });

    sendSuccess(res, updated);
  } catch (e) {
    next(e);
  }
};

export const deleteAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureAssignmentAccess(req, res, req.params.id);
    if (!assignment) return;

    await (prisma as any).assignment.delete({ where: { id: assignment.id } });
    sendSuccess(res, { message: 'Assignment deleted' });
  } catch (e) {
    next(e);
  }
};

export const createQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureAssignmentAccess(req, res, req.params.assignmentId);
    if (!assignment) return;

    const type = normalizeQuestionType(req.body?.type);
    const lastQuestion = await (prisma as any).assignmentQuestion.findFirst({
      where: { assignmentId: assignment.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const question = await (prisma as any).assignmentQuestion.create({
      data: {
        assignmentId: assignment.id,
        type,
        title: optionalString(req.body?.title) || null,
        prompt: optionalString(req.body?.prompt) || 'Untitled question',
        optionsJson: normalizeJsonArray(req.body?.options),
        correctAnswerJson: normalizeJsonObject(req.body?.correctAnswer),
        points: Number(req.body?.points) > 0 ? Number(req.body.points) : 1,
        order: (lastQuestion?.order ?? -1) + 1,
      },
    });

    sendSuccess(res, question, undefined, 201);
  } catch (e) {
    next(e);
  }
};

export const updateQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await (prisma as any).assignmentQuestion.findFirst({
      where: {
        id: req.params.questionId,
        assignment: { organizationId: req.user!.organizationId },
      },
    });
    if (!existing) {
      sendError(res, 'Question not found', 404);
      return;
    }

    const data: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(req.body, 'type')) {
      data.type = normalizeQuestionType(req.body?.type);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      data.title = optionalString(req.body?.title) || null;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'prompt')) {
      data.prompt = optionalString(req.body?.prompt) || existing.prompt;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'options')) {
      data.optionsJson = normalizeJsonArray(req.body?.options);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'correctAnswer')) {
      data.correctAnswerJson = normalizeJsonObject(req.body?.correctAnswer);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'points')) {
      data.points = Number(req.body?.points) > 0 ? Number(req.body.points) : existing.points;
    }

    const question = await (prisma as any).assignmentQuestion.update({
      where: { id: existing.id },
      data,
    });

    sendSuccess(res, question);
  } catch (e) {
    next(e);
  }
};

export const deleteQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await (prisma as any).assignmentQuestion.findFirst({
      where: {
        id: req.params.questionId,
        assignment: { organizationId: req.user!.organizationId },
      },
      select: { id: true },
    });
    if (!existing) {
      sendError(res, 'Question not found', 404);
      return;
    }

    await (prisma as any).assignmentQuestion.delete({ where: { id: existing.id } });
    sendSuccess(res, { message: 'Question deleted' });
  } catch (e) {
    next(e);
  }
};

export const listSubmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureAssignmentAccess(req, res, req.params.assignmentId);
    if (!assignment) return;

    const submissions = await (prisma as any).assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
      include: {
        student: { select: { id: true, username: true, email: true, profileImg: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    sendSuccess(res, submissions);
  } catch (e) {
    next(e);
  }
};

export const getAssignmentAnalytics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureAssignmentAccess(req, res, req.params.assignmentId);
    if (!assignment) return;

    const [questions, submissions, graded, pending, published] = await Promise.all([
      (prisma as any).assignmentQuestion.count({ where: { assignmentId: assignment.id } }),
      (prisma as any).assignmentSubmission.count({ where: { assignmentId: assignment.id } }),
      (prisma as any).assignmentSubmission.count({
        where: { assignmentId: assignment.id, status: { in: ['GRADED', 'RETURNED'] } },
      }),
      (prisma as any).assignmentSubmission.count({
        where: { assignmentId: assignment.id, status: 'SUBMITTED' },
      }),
      (prisma as any).assignmentSubmission.count({
        where: { assignmentId: assignment.id, status: 'RETURNED' },
      }),
    ]);

    sendSuccess(res, {
      questions,
      submissions,
      graded,
      pending,
      published,
      gradedRate: submissions > 0 ? (graded / submissions) * 100 : 0,
    });
  } catch (e) {
    next(e);
  }
};

export const gradeSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await (prisma as any).assignmentSubmission.findFirst({
      where: {
        id: req.params.submissionId,
        assignment: { organizationId: req.user!.organizationId },
      },
    });
    if (!existing) {
      sendError(res, 'Submission not found', 404);
      return;
    }

    const submission = await (prisma as any).assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        score: typeof req.body?.score === 'number' ? req.body.score : existing.score,
        maxScore: typeof req.body?.maxScore === 'number' ? req.body.maxScore : existing.maxScore,
        feedback: optionalString(req.body?.feedback) || null,
        status: existing.status === 'RETURNED' ? 'RETURNED' : 'GRADED',
        gradedAt: new Date(),
      },
    });

    sendSuccess(res, submission);
  } catch (e) {
    next(e);
  }
};

export const publishSubmission = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existing = await (prisma as any).assignmentSubmission.findFirst({
      where: {
        id: req.params.submissionId,
        assignment: { organizationId: req.user!.organizationId },
      },
      include: {
        student: {
          select: { id: true, username: true, email: true },
        },
        assignment: {
          select: {
            id: true,
            title: true,
            organizationId: true,
            batch: { select: { name: true } },
            topic: { select: { name: true } },
            organization: { select: { slug: true } },
          },
        },
      },
    });
    if (!existing) {
      sendError(res, 'Submission not found', 404);
      return;
    }

    const submission = await (prisma as any).assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        score: typeof req.body?.score === 'number' ? req.body.score : existing.score,
        maxScore: typeof req.body?.maxScore === 'number' ? req.body.maxScore : existing.maxScore,
        feedback: optionalString(req.body?.feedback) || null,
        status: 'RETURNED',
        gradedAt: existing.gradedAt || new Date(),
      },
    });

    const recipient = existing.student?.email?.trim();
    if (recipient) {
      const actionUrl = buildStudentPortalUrl(
        existing.assignment?.organization?.slug,
        `/student/assignments/${existing.assignment.id}`
      );

      try {
        await sendAssignmentResultEmail({
          organizationId: existing.assignment.organizationId,
          to: recipient,
          studentName: existing.student?.username || undefined,
          assignmentTitle: existing.assignment.title,
          courseName: existing.assignment.batch?.name || undefined,
          topicName: existing.assignment.topic?.name || undefined,
          score: submission.score,
          maxScore: submission.maxScore,
          feedback: submission.feedback,
          actionUrl,
        });
      } catch (mailError) {
        console.error('Failed to send assignment result email:', mailError);
      }
    }

    sendSuccess(res, submission);
  } catch (e) {
    next(e);
  }
};

export const getStudentAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureStudentAssignmentAccess(req, res, req.params.id);
    if (!assignment) return;

    const submission = await (prisma as any).assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: req.user!.userId,
        },
      },
    });

    sendSuccess(res, {
      ...assignment,
      questions: assignment.questions.map(serializeStudentQuestion),
      mySubmission: submission,
    });
  } catch (e) {
    next(e);
  }
};

export const submitAssignment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureStudentAssignmentAccess(req, res, req.params.id);
    if (!assignment) return;

    const answers = normalizeJsonObject(req.body?.answers);
    const maxScore = assignment.questions.reduce(
      (total: number, question: any) => total + Number(question.points || 0),
      0
    );

    const submission = await (prisma as any).assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: req.user!.userId,
        },
      },
      create: {
        assignmentId: assignment.id,
        studentId: req.user!.userId,
        answersJson: answers,
        maxScore,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        answersJson: answers,
        maxScore,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    sendSuccess(res, submission);
  } catch (e) {
    next(e);
  }
};
