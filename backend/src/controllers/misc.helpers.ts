import { Response } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../utils/prisma';
import { sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

// ── String helpers ────────────────────────────────────────

export const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

// ── Batch access guard ────────────────────────────────────

export const ensureBatchReadAccess = async (
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

// ── Topic quiz types ──────────────────────────────────────

export type TopicQuizQuestionType = 'MCQ' | 'TRUE_FALSE';

export type TopicQuizOption = {
  id: string;
  text: string;
};

export type TopicQuizQuestion = {
  id: string;
  text: string;
  type: TopicQuizQuestionType;
  explanation?: string;
  options?: TopicQuizOption[];
  correctOptionId?: string;
};

export type TopicQuiz = {
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

export const sanitizeTopicQuiz = (value: unknown): TopicQuiz | null => {
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

export const serializeTopicQuizForAuthoring = (value: unknown) => sanitizeTopicQuiz(value);

export const serializeTopicQuizForStudent = (value: unknown) => {
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

export const serializeTopicQuizAttempt = (
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

export const serializeTopicRecord = <
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

export const evaluateTopicQuizSubmission = (
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
