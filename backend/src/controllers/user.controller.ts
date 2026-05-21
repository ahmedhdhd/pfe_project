import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

// ── Users (Admin) ─────────────────────────────────────────

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({ where: { organizationId: req.user!.organizationId }, select: { id: true, email: true, username: true, role: true, isVerified: true, createdAt: true } });
    sendSuccess(res, users);
  } catch (e) { next(e); }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.user.deleteMany({ where: { id: req.params.userId, organizationId: req.user!.organizationId } });
    sendSuccess(res, { message: 'User deleted' });
  } catch (e) { next(e); }
};
