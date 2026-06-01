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

export const buildTopicQuizQuestionResults = (
  quiz: TopicQuiz,
  answers: Record<string, unknown>
) =>
  quiz.questions.map((question) => {
    const selectedOptionId =
      typeof answers[question.id] === 'string' ? String(answers[question.id]) : '';
    const selectedOption = question.options?.find((option) => option.id === selectedOptionId);
    const correctOption = question.options?.find((option) => option.id === question.correctOptionId);
    const isCorrect = selectedOptionId === question.correctOptionId;

    return {
      questionId: question.id,
      questionText: question.text,
      isCorrect,
      selectedAnswer: selectedOption?.text || '',
      correctAnswer: correctOption?.text || question.explanation || '',
      explanation: question.explanation || '',
    };
  });

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
        answersJson?: unknown;
      }
    | null
    | undefined,
  quiz?: TopicQuiz | null
) => {
  if (!attempt) {
    return null;
  }

  const answers =
    attempt.answersJson &&
    typeof attempt.answersJson === 'object' &&
    !Array.isArray(attempt.answersJson)
      ? (attempt.answersJson as Record<string, unknown>)
      : {};

  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    score: attempt.score,
    percentage: attempt.percentage,
    correctCount: attempt.correctCount,
    totalQuestions: attempt.totalQuestions,
    isPassed: attempt.isPassed,
    completedAt: attempt.completedAt,
    questionResults: quiz ? buildTopicQuizQuestionResults(quiz, answers) : [],
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
      answersJson?: unknown;
    }>;
  },
>(
  topic: T,
  role?: string,
  studentQuiz?: TopicQuiz | null
) => {
  const { quizJson, assignments, quizAttempts, ...rest } = topic;
  const quizForStudent =
    studentQuiz ?? (role === 'STUDENT' ? sanitizeTopicQuiz(quizJson) : null);

  return {
    ...rest,
    assignments: Array.isArray(assignments) ? assignments : [],
    quiz: role === 'STUDENT' ? serializeTopicQuizForStudent(quizJson) : null,
    latestQuizAttempt:
      role === 'STUDENT'
        ? serializeTopicQuizAttempt(quizAttempts?.[0], quizForStudent)
        : null,
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
