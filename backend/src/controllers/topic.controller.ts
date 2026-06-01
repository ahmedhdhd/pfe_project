import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { recordWeakConceptFlags } from '../utils/weak-concepts';
import {
  ensureBatchReadAccess,
  sanitizeTopicQuiz,
  serializeTopicQuizForAuthoring,
  serializeTopicQuizAttempt,
  serializeTopicRecord,
  evaluateTopicQuizSubmission,
  buildTopicQuizQuestionResults,
} from './misc.helpers';

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
    const studentQuiz =
      req.user?.role === 'STUDENT' ? sanitizeTopicQuiz(t.quizJson) : null;
    sendSuccess(res, serializeTopicRecord(t, req.user?.role, studentQuiz));
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

    const batchId = topic.chapter.subject.batchId;
    if (!(await ensureBatchReadAccess(req, res, batchId))) return;

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

    const questionResults = buildTopicQuizQuestionResults(quiz, answers);
    const weakConcepts = questionResults
      .filter((item) => !item.isCorrect)
      .map((item) => item.questionText)
      .slice(0, 5);

    if (weakConcepts.length > 0) {
      await recordWeakConceptFlags({
        studentId: userId,
        batchId,
        concepts: weakConcepts,
        suggestedReviewTopic: topic.name,
      });
    }

    sendSuccess(res, {
      topicId: topic.id,
      passingPercentage: quiz.passingPercentage,
      attempt: serializeTopicQuizAttempt(attempt, quiz),
    }, 'Quiz submitted successfully', 201);
  } catch (e) { next(e); }
};

export const deleteTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.topic.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};
