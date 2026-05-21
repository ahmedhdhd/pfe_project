import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { ensureBatchReadAccess } from './misc.helpers';

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
