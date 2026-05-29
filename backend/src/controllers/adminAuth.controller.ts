import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendVerificationEmail, sendInviteEmail } from '../utils/email';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId, email, username } = req.body;
    const existing = await prisma.user.findFirst({ where: { email, organizationId } });
    if (existing) { sendError(res, 'Email already registered', 409); return; }
    const user = await prisma.user.create({ data: { organizationId, email, username, role: 'ADMIN', isVerified: false } });
    const token = uuidv4();
    await prisma.emailToken.create({ data: { userId: user.id, token, type: 'VERIFY_EMAIL', expiresAt: new Date(Date.now() + 86400000) } });
    await sendVerificationEmail(email, token, FRONTEND, organizationId);
    sendSuccess(res, { id: user.id, email, username, message: 'Verification email sent' }, undefined, 201);
  } catch (e) { next(e); }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.body;
    const et = await prisma.emailToken.findUnique({ where: { token } });
    if (!et || et.usedAt || et.expiresAt < new Date()) { sendError(res, 'Invalid or expired token', 400); return; }
    await prisma.emailToken.update({ where: { id: et.id }, data: { usedAt: new Date() } });
    await prisma.user.update({ where: { id: et.userId }, data: { isVerified: true } });
    sendSuccess(res, { message: 'Email verified', userId: et.userId });
  } catch (e) { next(e); }
};

export const setPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, password } = req.body;
    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    sendSuccess(res, { message: 'Password set successfully' });
  } catch (e) { next(e); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { email, role: { in: ['ADMIN', 'TEACHER'] } }, include: { organization: { select: { name: true, slug: true } } } });
    if (!user?.passwordHash) { sendError(res, 'Invalid credentials', 401); return; }
    if (!user.isVerified) { sendError(res, 'Please verify your email first', 401); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { sendError(res, 'Invalid credentials', 401); return; }
    const payload = { userId: user.id, role: user.role as string, organizationId: user.organizationId };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    sendSuccess(res, { token: accessToken, refreshToken, user: { id: user.id, email: user.email, username: user.username, role: user.role, organizationId: user.organizationId, organizationName: user.organization.name, organizationSlug: user.organization.slug, hasCompletedOnboarding: user.hasCompletedOnboarding } });
  } catch (e) { next(e); }

};

export const refreshAdminToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) { sendError(res, 'Invalid refresh token', 401); return; }
    const payload = verifyRefreshToken(token);
    const newAccess = signAccessToken({ userId: payload.userId, role: payload.role, organizationId: payload.organizationId });
    const newRefresh = signRefreshToken({ userId: payload.userId, role: payload.role, organizationId: payload.organizationId });
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    await prisma.refreshToken.create({ data: { userId: payload.userId, token: newRefresh, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    sendSuccess(res, { accessToken: newAccess, refreshToken: newRefresh });
  } catch (e) { next(e); }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || user.isVerified) { sendSuccess(res, { message: 'If email exists and is unverified, a link was sent' }); return; }
    const token = uuidv4();
    await prisma.emailToken.create({ data: { userId: user.id, token, type: 'VERIFY_EMAIL', expiresAt: new Date(Date.now() + 86400000) } });
    await sendVerificationEmail(email, token, FRONTEND, user.organizationId);
    sendSuccess(res, { message: 'Verification email sent' });
  } catch (e) { next(e); }
};

export const inviteUser = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, username } = req.body;
    const organizationId = req.user!.organizationId;
    const existing = await prisma.user.findFirst({ where: { email, organizationId } });
    if (existing) { sendError(res, 'User already exists', 409); return; }
    const user = await prisma.user.create({ data: { organizationId, email, username, role: 'TEACHER', isVerified: false } });
    const token = uuidv4();
    await prisma.emailToken.create({ data: { userId: user.id, token, type: 'INVITE', expiresAt: new Date(Date.now() + 7 * 86400000) } });
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    await sendInviteEmail(
      email,
      token,
      org?.name || 'TeslaAcademy',
      FRONTEND,
      organizationId
    );
    sendSuccess(res, { id: user.id, email, username, role: 'TEACHER', organizationId, message: 'Invite sent' }, undefined, 201);
  } catch (e) { next(e); }
};
