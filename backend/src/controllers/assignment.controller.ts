import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { sendAssignmentResultEmail } from '../utils/email';
import { validateGeneratedAssignmentQuestion } from '../utils/assignment-ai-validation';
import { recordWeakConceptFlags } from '../utils/weak-concepts';
import { aiService, AiServiceError } from '../utils/ai-service-client';
import { logger } from '../utils/logger';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const QUESTION_TYPES = ['QUIZ', 'TRUE_FALSE', 'SHORT_ANSWER', 'FILE_SUBMISSION'] as const;
type AssignmentQuestionType = (typeof QUESTION_TYPES)[number];
const QUESTION_LEVELS = ['EASY', 'MEDIUM', 'HARD'] as const;
type AssignmentQuestionLevel = (typeof QUESTION_LEVELS)[number];

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

const normalizeQuestionLevel = (value: unknown): AssignmentQuestionLevel =>
  QUESTION_LEVELS.includes(String(value || '').toUpperCase() as AssignmentQuestionLevel)
    ? (String(value || '').toUpperCase() as AssignmentQuestionLevel)
    : 'MEDIUM';

const normalizeJsonArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const normalizeJsonObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const stripHtml = (value: unknown) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getCorrectAnswerLabel = (question: any) => {
  const correct = normalizeJsonObject(question.correctAnswerJson);
  if (question.type === 'QUIZ') {
    const optionId = String(correct.optionId || '');
    const option = normalizeJsonArray(question.optionsJson).find(
      (item: any) => String(item?.id) === optionId
    ) as any;
    return stripHtml(option?.text || optionId);
  }
  if (question.type === 'TRUE_FALSE') {
    return String(Boolean(correct.value));
  }
  if (question.type === 'SHORT_ANSWER') {
    return stripHtml(correct.text || '');
  }
  return '';
};

const getStudentAnswerLabel = (question: any, answers: Record<string, unknown>) => {
  const answer = answers[question.id];
  if (question.type === 'QUIZ') {
    const option = normalizeJsonArray(question.optionsJson).find(
      (item: any) => String(item?.id) === String(answer || '')
    ) as any;
    return stripHtml(option?.text || answer || '');
  }
  if (question.type === 'TRUE_FALSE') {
    return String(Boolean(answer));
  }
  return stripHtml(answer || '');
};

const isObjectiveAnswerCorrect = (question: any, answers: Record<string, unknown>) => {
  const correct = normalizeJsonObject(question.correctAnswerJson);
  const answer = answers[question.id];
  if (question.type === 'QUIZ') return String(answer || '') === String(correct.optionId || '');
  if (question.type === 'TRUE_FALSE') return Boolean(answer) === Boolean(correct.value);
  return null;
};

const buildAssignmentAttemptContext = ({
  assignment,
  answers,
}: {
  assignment: any;
  answers: Record<string, unknown>;
}) =>
  (assignment.questions || []).map((question: any, index: number) => ({
    questionId: question.id,
    number: index + 1,
    type: question.type,
    prompt: stripHtml(question.prompt),
    points: Number(question.points || 0),
    studentAnswer: getStudentAnswerLabel(question, answers),
    correctAnswer: getCorrectAnswerLabel(question),
    isCorrect: isObjectiveAnswerCorrect(question, answers),
  }));

const buildRuleBasedAssignmentFeedback = ({
  assignment,
  answers,
  scorePercent,
}: {
  assignment: any;
  answers: Record<string, unknown>;
  scorePercent: number | null;
}) => {
  const questionFeedback = buildAssignmentAttemptContext({ assignment, answers }).map((item: any) => ({
    questionId: item.questionId,
    isCorrect: item.isCorrect,
    feedback:
      item.isCorrect === true
        ? 'Good work. Your answer matches the expected concept.'
        : item.isCorrect === false
        ? `Review this question again. Your answer was "${item.studentAnswer || 'blank'}"; the expected answer is "${item.correctAnswer || 'the answer key'}".`
        : 'This answer needs teacher review. Compare your response with the suggested answer and improve the key idea.',
    whyCorrectAnswer: item.correctAnswer,
    studyHint: `Revisit the part of the assignment about: ${item.prompt.slice(0, 120)}`,
  }));

  const weakConcepts = questionFeedback
    .filter((item: any) => item.isCorrect === false)
    .map((item: any) => {
      const question = (assignment.questions || []).find((q: any) => q.id === item.questionId);
      return stripHtml(question?.title || question?.prompt || 'Assignment concept').slice(0, 120);
    })
    .slice(0, 5);

  return {
    overallFeedback:
      scorePercent !== null && scorePercent >= 70
        ? 'You showed solid understanding. Review the missed or manually graded questions to make the answer stronger.'
        : 'This submission shows areas to reinforce. Focus on the weak concepts below, then review the assignment material again.',
    weakConcepts,
    strengths: scorePercent !== null && scorePercent >= 80 ? ['Strong overall assignment performance'] : [],
    recommendations: [
      'Review questions marked incorrect or unclear.',
      'Compare short answers with the suggested answer key.',
      'Ask your teacher about any concept that still feels confusing.',
    ],
    questionFeedback,
  };
};

const generateAssignmentAiFeedbackPayload = async ({
  organizationId,
  assignment,
  answers,
  scorePercent,
}: {
  organizationId: string;
  assignment: any;
  answers: Record<string, unknown>;
  scorePercent: number | null;
}) => {
  const fallback = buildRuleBasedAssignmentFeedback({ assignment, answers, scorePercent });
  const questionContext = buildAssignmentAttemptContext({ assignment, answers });

  try {
    const parsed = await aiService.assignmentFeedback({
      organizationId,
      batchId: assignment.batchId,
      topicId: assignment.topicId || undefined,
      assignmentTitle: assignment.title,
      assignmentDescription: stripHtml(assignment.description),
      courseName: assignment.batch?.name || '',
      topicName: assignment.topic?.name || '',
      scorePercent,
      questions: questionContext,
    });

    if (parsed.ragStatus === 'no_chunks') {
      logger.warn(
        `Assignment AI feedback used with no RAG chunks for assignment ${assignment.id}`
      );
    }

    return {
      overallFeedback:
        typeof parsed.overallFeedback === 'string'
          ? parsed.overallFeedback
          : fallback.overallFeedback,
      weakConcepts: normalizeJsonArray(parsed.weakConcepts),
      strengths: normalizeJsonArray(parsed.strengths),
      recommendations: normalizeJsonArray(parsed.recommendations),
      questionFeedback: normalizeJsonArray(parsed.questionFeedback),
      suggestedScorePercent:
        typeof parsed.suggestedScorePercent === 'number'
          ? Math.min(100, Math.max(0, parsed.suggestedScorePercent))
          : null,
    };
  } catch (error: any) {
    logger.warn(`Assignment AI feedback fallback used: ${error?.message || String(error)}`);
    return { ...fallback, suggestedScorePercent: null };
  }
};

const upsertAssignmentAiFeedback = async (submissionId: string) => {
  const submission = await (prisma as any).assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: {
          batch: { select: { name: true } },
          topic: { select: { name: true } },
          questions: { orderBy: { order: 'asc' } },
        },
      },
    },
  });
  if (!submission?.assignment) return null;

  const answers = normalizeJsonObject(submission.answersJson);
  const scorePercent =
    typeof submission.score === 'number' &&
    typeof submission.maxScore === 'number' &&
    submission.maxScore > 0
      ? (submission.score / submission.maxScore) * 100
      : null;
  const payload = await generateAssignmentAiFeedbackPayload({
    organizationId: submission.assignment.organizationId,
    assignment: submission.assignment,
    answers,
    scorePercent,
  });

  const resolvedScorePercent =
    scorePercent ??
    (typeof payload.suggestedScorePercent === 'number'
      ? payload.suggestedScorePercent
      : null);

  const feedbackRecord = await (prisma as any).assignmentAiFeedback.upsert({
    where: { submissionId: submission.id },
    create: {
      submissionId: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      batchId: submission.assignment.batchId,
      scorePercent: resolvedScorePercent,
      feedbackText: payload.overallFeedback,
      weakConceptsJson: payload.weakConcepts,
      strengthsJson: payload.strengths,
      recommendationsJson: payload.recommendations,
      questionFeedbackJson: payload.questionFeedback,
      generatedAt: new Date(),
    },
    update: {
      scorePercent: resolvedScorePercent,
      feedbackText: payload.overallFeedback,
      weakConceptsJson: payload.weakConcepts,
      strengthsJson: payload.strengths,
      recommendationsJson: payload.recommendations,
      questionFeedbackJson: payload.questionFeedback,
      generatedAt: new Date(),
    },
  });

  await recordWeakConceptFlags({
    studentId: submission.studentId,
    batchId: submission.assignment.batchId,
    concepts: payload.weakConcepts,
    suggestedReviewTopic:
      submission.assignment.topic?.name || submission.assignment.title || 'Assignment review',
  });

  return feedbackRecord;
};

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

export const generateAssignmentWithAi = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureAssignmentAccess(req, res, req.params.id);
    if (!assignment) return;

    const promptText = optionalString(req.body?.prompt);
    if (!promptText) {
      sendError(res, 'prompt is required', 400);
      return;
    }

    const count = Math.min(Math.max(Number(req.body?.count) || 5, 1), 12);
    const level = normalizeQuestionLevel(req.body?.level);
    const contentIds = normalizeJsonArray(req.body?.contentIds)
      .map((item) => String(item || '').trim())
      .filter(Boolean);

    let parsed: {
      questions?: unknown[];
      ragChunksUsed?: number;
      ragStatus?: string;
    };
    try {
      parsed = await aiService.assignmentGenerateQuestions({
        organizationId: req.user!.organizationId,
        batchId: assignment.batchId,
        topicId: assignment.topicId || undefined,
        contentIds: contentIds.length > 0 ? contentIds : undefined,
        assignmentTitle: assignment.title,
        assignmentDescription: stripHtml(assignment.description),
        courseName: assignment.batch?.name || '',
        topicName: assignment.topic?.name || '',
        teacherPrompt: promptText,
        count,
        level,
      });
    } catch (error: any) {
      const message =
        error instanceof AiServiceError
          ? error.message
          : String(error?.message || error);
      const statusCode = error instanceof AiServiceError && error.statusCode === 422 ? 422 : 502;
      sendError(res, message.slice(0, 400), statusCode);
      return;
    }

    const questions = normalizeJsonArray(parsed.questions)
      .map((question: any) => {
        const type = normalizeQuestionType(question?.type);
        const normalizedType = type === 'FILE_SUBMISSION' ? 'SHORT_ANSWER' : type;
        return {
          type: normalizedType,
          title: optionalString(question?.title) || null,
          prompt: optionalString(question?.prompt) || 'Generated question',
          points: Number(question?.points) > 0 ? Number(question.points) : 1,
          options:
            normalizedType === 'QUIZ'
              ? normalizeJsonArray(question?.options).slice(0, 6)
              : normalizedType === 'TRUE_FALSE'
              ? [
                  { id: 'true', text: 'True' },
                  { id: 'false', text: 'False' },
                ]
              : [],
          correctAnswer: normalizeJsonObject(question?.correctAnswer),
        };
      })
      .filter((question: any) => {
        if (!question.prompt) return false;
        const validationError = validateGeneratedAssignmentQuestion(question);
        if (validationError) {
          logger.warn(`Skipping invalid generated question: ${validationError}`);
          return false;
        }
        return true;
      });

    if (questions.length === 0) {
      sendError(res, 'AI did not return valid questions. Try a more specific prompt.', 502);
      return;
    }

    const lastQuestion = await (prisma as any).assignmentQuestion.findFirst({
      where: { assignmentId: assignment.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const startOrder = (lastQuestion?.order ?? -1) + 1;

    const created = await (prisma as any).$transaction(
      questions.map((question: any, index: number) =>
        (prisma as any).assignmentQuestion.create({
          data: {
            assignmentId: assignment.id,
            type: question.type,
            title: question.title,
            prompt: question.prompt,
            optionsJson: question.options,
            correctAnswerJson: question.correctAnswer,
            points: question.points,
            order: startOrder + index,
          },
        })
      )
    );

    sendSuccess(res, {
      questions: created,
      ragChunksUsed: 0,
      ragStatus: 'llm',
    }, undefined, 201);
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
        aiFeedback: true,
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

    await upsertAssignmentAiFeedback(submission.id);

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

    await upsertAssignmentAiFeedback(submission.id);

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
      include: { aiFeedback: true },
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

    const existing = await (prisma as any).assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: req.user!.userId,
        },
      },
    });

    if (existing?.submittedAt) {
      sendError(res, 'Assignment already submitted', 400);
      return;
    }

    const answers = normalizeJsonObject(req.body?.answers);
    const { _meta: _, ...submissionAnswers } = answers;
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
        answersJson: submissionAnswers,
        maxScore,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      update: {
        answersJson: submissionAnswers,
        maxScore,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { aiFeedback: true },
    });

    const aiFeedback = await upsertAssignmentAiFeedback(submission.id);

    sendSuccess(res, { ...submission, aiFeedback });
  } catch (e) {
    next(e);
  }
};

export const saveAssignmentDraft = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignment = await ensureStudentAssignmentAccess(req, res, req.params.id);
    if (!assignment) return;

    const existing = await (prisma as any).assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: req.user!.userId,
        },
      },
    });

    if (existing?.submittedAt) {
      sendError(res, 'Assignment already submitted', 400);
      return;
    }

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
        status: 'DRAFT',
      },
      update: {
        answersJson: answers,
        maxScore,
        status: 'DRAFT',
      },
    });

    sendSuccess(res, submission);
  } catch (e) {
    next(e);
  }
};
