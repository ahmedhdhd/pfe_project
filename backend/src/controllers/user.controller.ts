import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const listUsers = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({ where: { organizationId: req.user!.organizationId }, select: { id: true, email: true, username: true, role: true, isVerified: true, hasCompletedOnboarding: true, createdAt: true } });
    sendSuccess(res, users);
  } catch (e) { next(e); }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.user.deleteMany({ where: { id: req.params.userId, organizationId: req.user!.organizationId } });
    sendSuccess(res, { message: 'User deleted' });
  } catch (e) { next(e); }
};

export const updateCurrentUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { hasCompletedOnboarding, username, profileImg } = req.body as {
      hasCompletedOnboarding?: boolean;
      username?: string;
      profileImg?: string;
    };

    const data: Record<string, unknown> = {};
    if (typeof hasCompletedOnboarding === 'boolean') {
      data.hasCompletedOnboarding = hasCompletedOnboarding;
    }
    if (typeof username === 'string' && username.trim()) {
      data.username = username.trim();
    }
    if (typeof profileImg === 'string') {
      data.profileImg = profileImg;
    }

    if (Object.keys(data).length === 0) {
      sendError(res, 'No valid fields to update', 400);
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      include: { organization: { select: { name: true, slug: true } } },
    });

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      organizationSlug: user.organization.slug,
      isVerified: user.isVerified,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    });
  } catch (e) {
    next(e);
  }
};
