import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { buildOpenRouterHeaders } from '../utils/openrouter';
import { logger } from '../utils/logger';
import {
  ensureBatchReadAccess,
  sanitizeTopicQuiz,
  serializeTopicQuizForAuthoring,
  serializeTopicQuizAttempt,
  serializeTopicRecord,
  evaluateTopicQuizSubmission,
  TopicQuiz,
} from './misc.helpers';

const safeJsonArray = (value: unknown) => (Array.isArray(value) ? value : []);

const extractJsonObject = (text: string): Record<string, unknown> => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI feedback response did not contain JSON');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
};

const buildRuleBasedFeedback = ({
  quiz,
  answers,
  percentage,
}: {
  quiz: TopicQuiz;
  answers: Record<string, unknown>;
  percentage: number;
}) => {
  const questionFeedback = quiz.questions.map((question) => {
    const selectedOptionId = typeof answers[question.id] === 'string' ? String(answers[question.id]) : '';
    const selectedOption = question.options?.find((option) => option.id === selectedOptionId);
    const correctOption = question.options?.find((option) => option.id === question.correctOptionId);
    const isCorrect = selectedOptionId === question.correctOptionId;

    return {
      questionId: question.id,
      isCorrect,
      feedback: isCorrect
        ? 'Good work. Your answer matches the expected concept.'
        : `Review this idea again. You chose "${selectedOption?.text || 'no answer'}", while the correct answer is "${correctOption?.text || 'the expected option'}".`,
      whyCorrectAnswer: question.explanation || correctOption?.text || '',
      studyHint: question.explanation || 'Go back to the lesson section that introduced this concept and retry the quiz.',
    };
  });

  const weakConcepts = questionFeedback
    .filter((item) => !item.isCorrect)
    .map((item) => quiz.questions.find((question) => question.id === item.questionId)?.text || 'Topic concept')
    .slice(0, 5);

  return {
    overallFeedback:
      percentage >= quiz.passingPercentage
        ? 'You passed this quiz. Review any missed questions, then continue to the next lesson.'
        : 'This attempt shows a few concepts need reinforcement. Review the missed questions, then try again.',
    weakConcepts,
    strengths: percentage >= 80 ? ['Strong overall understanding'] : [],
    recommendations: [
      {
        type: 'TOPIC',
        reason: percentage >= quiz.passingPercentage ? 'Review missed questions before moving on.' : 'Review this topic before retaking the quiz.',
      },
    ],
    questionFeedback,
  };
};

const generateQuizAiFeedbackPayload = async ({
  organizationId,
  topicName,
  quiz,
  answers,
  percentage,
}: {
  organizationId: string;
  topicName: string;
  quiz: TopicQuiz;
  answers: Record<string, unknown>;
  percentage: number;
}) => {
  const fallback = buildRuleBasedFeedback({ quiz, answers, percentage });
  const orgAiConfig = await prisma.organizationConfig.findUnique({
    where: { organizationId },
    select: { openRouterApiKey: true },
  });
  const openRouterApiKey = orgAiConfig?.openRouterApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';
  if (!openRouterApiKey) return fallback;

  const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324';
  const prompt = `You are an educational tutor. Analyze this topic quiz attempt for "${topicName}".
Return JSON only with keys: overallFeedback, weakConcepts, strengths, recommendations, questionFeedback.
Each questionFeedback item must include: questionId, isCorrect, feedback, whyCorrectAnswer, studyHint.
Be concise, kind, and explain what the student got wrong and why.

Quiz and attempt:
${JSON.stringify({ quiz, answers, percentage }).slice(0, 18000)}`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: buildOpenRouterHeaders(openRouterApiKey),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: Number(process.env.OPENROUTER_QUIZ_FEEDBACK_MAX_TOKENS || 1400),
      }),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`OpenRouter quiz feedback failed (${response.status}): ${raw.slice(0, 400)}`);
    const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim() || '';
    const parsed = extractJsonObject(content);
    return {
      overallFeedback: typeof parsed.overallFeedback === 'string' ? parsed.overallFeedback : fallback.overallFeedback,
      weakConcepts: safeJsonArray(parsed.weakConcepts),
      strengths: safeJsonArray(parsed.strengths),
      recommendations: safeJsonArray(parsed.recommendations),
      questionFeedback: safeJsonArray(parsed.questionFeedback),
    };
  } catch (error: any) {
    logger.warn(`Quiz AI feedback fallback used: ${error?.message || String(error)}`);
    return fallback;
  }
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
                include: { aiFeedback: true },
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
    const aiFeedbackPayload = await generateQuizAiFeedbackPayload({
      organizationId: req.user!.organizationId,
      topicName: topic.name,
      quiz,
      answers,
      percentage: result.percentage,
    });
    const aiFeedback = await prisma.quizAiFeedback.create({
      data: {
        quizAttemptId: attempt.id,
        userId,
        topicId: topic.id,
        batchId: topic.chapter.subject.batchId,
        scorePercent: result.percentage,
        weakConceptsJson: safeJsonArray(aiFeedbackPayload.weakConcepts) as Prisma.InputJsonValue,
        strengthsJson: safeJsonArray(aiFeedbackPayload.strengths) as Prisma.InputJsonValue,
        recommendationsJson: safeJsonArray(aiFeedbackPayload.recommendations) as Prisma.InputJsonValue,
        questionFeedbackJson: safeJsonArray(aiFeedbackPayload.questionFeedback) as Prisma.InputJsonValue,
        feedbackText: String(aiFeedbackPayload.overallFeedback || ''),
      },
    });

    sendSuccess(res, {
      topicId: topic.id,
      passingPercentage: quiz.passingPercentage,
      attempt: serializeTopicQuizAttempt({ ...attempt, aiFeedback }),
    }, 'Quiz submitted successfully', 201);
  } catch (e) { next(e); }
};

export const deleteTopic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.topic.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};
