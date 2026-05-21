import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

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
