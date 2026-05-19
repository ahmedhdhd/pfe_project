import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const startAttempt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { testId } = req.params;
    const userId = req.user!.userId;
    const test = await prisma.test.findUnique({ where: { id: testId, isPublished: true } });
    if (!test) { sendError(res, 'Test not found', 404); return; }

    // Resume incomplete attempt
    const existing = await prisma.testAttempt.findFirst({ where: { testId, userId, isCompleted: false }, orderBy: { createdAt: 'desc' } });
    if (existing) {
      const details = await buildAttemptDetails(existing.id);
      sendSuccess(res, details);
      return;
    }

    const count = await prisma.testAttempt.count({ where: { testId, userId } });
    const attempt = await prisma.testAttempt.create({ data: { testId, userId, attemptNumber: count + 1 } });
    const details = await buildAttemptDetails(attempt.id);
    sendSuccess(res, details, undefined, 201);
  } catch (e) { next(e); }
};

export const getAttemptDetails = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attempt = await buildAttemptDetails(req.params.attemptId);
    if (!attempt) { sendError(res, 'Attempt not found', 404); return; }
    sendSuccess(res, attempt);
  } catch (e) { next(e); }
};

export const saveAnswer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedOptionId, textAnswer, timeSpentSeconds, isMarkedForReview } = req.body;
    await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, selectedOptionId, textAnswer, timeSpentSeconds: timeSpentSeconds || 0, isMarkedForReview: isMarkedForReview || false },
      update: { selectedOptionId, textAnswer, timeSpentSeconds: timeSpentSeconds || 0, isMarkedForReview: isMarkedForReview || false },
    });
    sendSuccess(res, { saved: true });
  } catch (e) { next(e); }
};

export const submitAttempt = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { attemptId } = req.params;
    const userId = req.user!.userId;
    const attempt = await prisma.testAttempt.findFirst({ where: { id: attemptId, userId } });
    if (!attempt) { sendError(res, 'Attempt not found', 404); return; }
    if (attempt.isCompleted) { sendError(res, 'Already submitted', 400); return; }

    // Score the attempt
    const test = await prisma.test.findUnique({ where: { id: attempt.testId }, include: { sections: { include: { questions: { include: { options: true } } } } } });
    const answers = await prisma.attemptAnswer.findMany({ where: { attemptId } });
    const answerMap = new Map(answers.map((a) => [a.questionId, a]));

    let totalScore = 0, correct = 0, wrong = 0, skipped = 0;
    const answerUpdates: Promise<unknown>[] = [];

    for (const section of test!.sections) {
      for (const q of section.questions) {
        const ans = answerMap.get(q.id);
        if (!ans || (!ans.selectedOptionId && !ans.textAnswer)) { skipped++; continue; }

        let isCorrect = false;
        if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
          const correctOpt = q.options.find((o) => o.isCorrect);
          isCorrect = correctOpt?.id === ans.selectedOptionId;
        } else if (q.type === 'NUMERICAL') {
          isCorrect = q.correctNumber !== null && parseFloat(ans.textAnswer || '') === q.correctNumber;
        } else if (q.type === 'FILL_BLANK') {
          isCorrect = q.correctText?.toLowerCase().trim() === ans.textAnswer?.toLowerCase().trim();
        }

        const marks = isCorrect ? q.marks : -q.negativeMarks;
        totalScore += marks;
        if (isCorrect) correct++; else wrong++;
        answerUpdates.push(prisma.attemptAnswer.update({ where: { id: ans.id }, data: { isCorrect, marksAwarded: marks } }));
      }
    }
    await Promise.all(answerUpdates);

    const pct = test!.totalMarks > 0 ? (totalScore / test!.totalMarks) * 100 : 0;
    const isPassed = totalScore >= test!.passingMarks;
    const elapsed = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

    await prisma.testAttempt.update({ where: { id: attemptId }, data: { isCompleted: true, submittedAt: new Date(), totalScore, percentage: pct, isPassed, correctCount: correct, wrongCount: wrong, skippedCount: skipped, timeSpentSeconds: elapsed } });

    // Calculate rank
    const betterCount = await prisma.testAttempt.count({ where: { testId: attempt.testId, isCompleted: true, totalScore: { gt: totalScore } } });
    const totalAttempts = await prisma.testAttempt.count({ where: { testId: attempt.testId, isCompleted: true } });
    const rank = betterCount + 1;
    const percentile = totalAttempts > 1 ? ((totalAttempts - rank) / (totalAttempts - 1)) * 100 : 100;

    await prisma.testAttempt.update({ where: { id: attemptId }, data: { rank, percentile } });
    sendSuccess(res, { attemptId, totalScore, percentage: pct, rank, percentile });
  } catch (e) { next(e); }
};

export const getAttemptResults = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attempt = await prisma.testAttempt.findFirst({ where: { id: req.params.attemptId, userId: req.user!.userId } });
    if (!attempt) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, attempt);
  } catch (e) { next(e); }
};

export const getAttemptSolutions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attempt = await prisma.testAttempt.findFirst({ where: { id: req.params.attemptId, userId: req.user!.userId } });
    if (!attempt || !attempt.isCompleted) { sendError(res, 'Not found or not submitted', 404); return; }
    const answers = await prisma.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
      include: { question: { include: { options: true } } },
    });
    sendSuccess(res, answers);
  } catch (e) { next(e); }
};

export const getMyAttemptsByTest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const attempts = await prisma.testAttempt.findMany({ where: { testId: req.params.testId, userId: req.user!.userId }, orderBy: { createdAt: 'desc' } });
    sendSuccess(res, attempts);
  } catch (e) { next(e); }
};

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { testId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const topAttempts = await prisma.testAttempt.findMany({
      where: { testId, isCompleted: true },
      include: { user: { select: { username: true } } },
      orderBy: { totalScore: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const leaderboard = topAttempts.map((a, i) => ({ rank: (page - 1) * limit + i + 1, userId: a.userId, username: a.user.username, score: a.totalScore, percentage: a.percentage }));
    sendSuccess(res, { leaderboard });
  } catch (e) { next(e); }
};

export const getRecentCompleted = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const where = { userId, isCompleted: true, ...(req.query.testSeriesId ? { test: { testSeriesId: req.query.testSeriesId as string } } : {}), ...(req.query.isPassed !== undefined ? { isPassed: req.query.isPassed === 'true' } : {}) };
    const [attempts, total] = await Promise.all([
      prisma.testAttempt.findMany({ where, include: { test: { include: { testSeries: { select: { id: true, title: true, exam: true } } } } }, orderBy: { submittedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.testAttempt.count({ where }),
    ]);
    sendSuccess(res, { data: attempts, pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 } });
  } catch (e) { next(e); }
};

export const getAttemptStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const where = { userId, isCompleted: true, ...(req.query.testSeriesId ? { test: { testSeriesId: req.query.testSeriesId as string } } : {}) };
    const [agg, passed, total, time] = await Promise.all([
      prisma.testAttempt.aggregate({ where, _avg: { totalScore: true, percentage: true }, _max: { totalScore: true, percentage: true }, _count: { id: true } }),
      prisma.testAttempt.count({ where: { ...where, isPassed: true } }),
      prisma.testAttempt.count({ where: { userId } }),
      prisma.testAttempt.aggregate({ where, _sum: { timeSpentSeconds: true } }),
    ]);
    const totalSecs = time._sum.timeSpentSeconds || 0;
    sendSuccess(res, {
      totalTestsAttempted: total, totalTestsCompleted: agg._count.id, totalTestsPassed: passed,
      averageScore: agg._avg.totalScore || 0, averagePercentage: agg._avg.percentage || 0,
      passRate: agg._count.id > 0 ? (passed / agg._count.id) * 100 : 0,
      totalTimeSpentSeconds: totalSecs, totalTimeSpentHours: totalSecs / 3600,
      bestScore: agg._max.totalScore || 0, bestPercentage: agg._max.percentage || 0,
      recentTrend: 'stable',
    });
  } catch (e) { next(e); }
};

// Helper
async function buildAttemptDetails(attemptId: string) {
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: { include: { sections: { include: { questions: { include: { options: { select: { id: true, text: true } } } } } } } },
      answers: true,
    },
  });
  if (!attempt) return null;
  const questions = attempt.test.sections.flatMap((s) =>
    s.questions.map((q) => ({ id: q.id, sectionId: s.id, text: q.text, imageUrl: q.imageUrl, type: q.type, marks: q.marks, negativeMarks: q.negativeMarks, options: q.options }))
  );
  return { ...attempt, durationMinutes: attempt.test.durationMinutes, questions, answers: Object.fromEntries(attempt.answers.map((a) => [a.questionId, a.selectedOptionId || a.textAnswer])) };
}
