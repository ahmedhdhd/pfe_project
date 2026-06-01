import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  ensureBatchReadAccess,
  sanitizeTopicQuiz,
  serializeTopicRecord,
} from './misc.helpers';

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
            serializeTopicRecord(
              topic,
              req.user?.role,
              sanitizeTopicQuiz(topic.quizJson)
            )
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
            serializeTopicRecord(
              topic,
              req.user?.role,
              sanitizeTopicQuiz(topic.quizJson)
            )
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
