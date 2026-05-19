import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import prisma from '../utils/prisma';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401);
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
        organizationId: true,
        email: true,
      },
    });

    if (!currentUser) {
      sendError(res, 'User not found', 401);
      return;
    }

    req.user = {
      userId: currentUser.id,
      role: currentUser.role,
      organizationId: currentUser.organizationId,
      email: currentUser.email ?? payload.email,
    };
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'ADMIN') {
    sendError(res, 'Admin access required', 403);
    return;
  }
  next();
};

export const requireTeacher = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!['ADMIN', 'TEACHER'].includes(req.user?.role || '')) {
    sendError(res, 'Teacher or Admin access required', 403);
    return;
  }
  next();
};

export const requireStudent = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'STUDENT') {
    sendError(res, 'Student access required', 403);
    return;
  }
  next();
};
