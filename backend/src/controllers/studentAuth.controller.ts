import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendStudentVerificationEmail, sendStudentPasswordResetEmail } from '../utils/email';
import { sendSuccess, sendError } from '../utils/response';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId, email, password, firstName, lastName } = req.body;
    const username = `${firstName} ${lastName}`.trim();

    const existing = await prisma.user.findFirst({ where: { email, organizationId } });
    if (existing) { sendError(res, 'Email already registered', 409); return; }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        organizationId,
        email,
        username,
        passwordHash,
        role: 'STUDENT',
        isVerified: false,
      },
    });

    const token = uuidv4();
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        token,
        type: 'VERIFY_EMAIL',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    const slug = organization?.slug || '';

    await sendStudentVerificationEmail(
      email,
      token,
      FRONTEND,
      slug,
      organizationId
    );
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
    const { email, password, organizationId } = req.body;

    const user = await prisma.user.findFirst({
      where: { email, organizationId, role: 'STUDENT' },
    });

    if (!user?.passwordHash) { sendError(res, 'Invalid credentials', 401); return; }
    if (!user.isVerified) { sendError(res, 'Please verify your email first', 401); return; }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { sendError(res, 'Invalid credentials', 401); return; }

    const payload = { userId: user.id, role: 'STUDENT', organizationId: user.organizationId };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });

    sendSuccess(res, {
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: 'STUDENT',
        organizationId: user.organizationId,
      },
    });
  } catch (e) { next(e); }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, organizationId } = req.body;
    const user = await prisma.user.findFirst({ where: { email, organizationId, role: 'STUDENT' } });
    if (!user || user.isVerified) { sendSuccess(res, { message: 'If eligible, a link was sent' }); return; }

    const token = uuidv4();
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        token,
        type: 'VERIFY_EMAIL',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    const slug = organization?.slug || '';

    await sendStudentVerificationEmail(
      email,
      token,
      FRONTEND,
      slug,
      organizationId
    );
    sendSuccess(res, { message: 'Verification email sent' });
  } catch (e) { next(e); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, organizationId } = req.body;

    const user = await prisma.user.findFirst({
      where: { email, organizationId, role: 'STUDENT' },
    });

    if (!user) {
      sendSuccess(res, { message: 'If the email exists, a reset link was sent' });
      return;
    }

    const token = uuidv4();
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        token,
        type: 'RESET_PASSWORD',
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
    const slug = organization?.slug || '';

    await sendStudentPasswordResetEmail(
      email,
      token,
      FRONTEND,
      slug,
      organizationId
    );
    sendSuccess(res, { message: 'If the email exists, a reset link was sent' });
  } catch (e) { next(e); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;

    const et = await prisma.emailToken.findUnique({ where: { token } });
    if (!et || et.usedAt || et.expiresAt < new Date() || et.type !== 'RESET_PASSWORD') {
      sendError(res, 'Invalid or expired token', 400);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: et.userId },
      data: { passwordHash },
    });

    await prisma.emailToken.update({
      where: { id: et.id },
      data: { usedAt: new Date() },
    });

    sendSuccess(res, { message: 'Password reset successfully' });
  } catch (e) { next(e); }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) { sendError(res, 'Invalid refresh token', 401); return; }
    const payload = verifyRefreshToken(token);
    const newAccess = signAccessToken({ userId: payload.userId, role: payload.role, organizationId: payload.organizationId });
    const newRefresh = signRefreshToken({ userId: payload.userId, role: payload.role, organizationId: payload.organizationId });
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    await prisma.refreshToken.create({ data: { userId: payload.userId, token: newRefresh, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    sendSuccess(res, { accessToken: newAccess, refreshToken: newRefresh, user });
  } catch (e) { next(e); }
};

export const getOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { countryCode, phoneNumber, organizationId } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`OTP for ${countryCode}${phoneNumber}: ${otp}`);
    let user = await prisma.user.findFirst({ where: { phoneNumber, countryCode, organizationId } });
    if (!user) {
      user = await prisma.user.create({
        data: { organizationId, phoneNumber, countryCode, username: phoneNumber, role: 'STUDENT', isVerified: false },
      });
    }
    await prisma.emailToken.create({
      data: { userId: user.id, token: otp, type: 'OTP', expiresAt: new Date(Date.now() + 600000) },
    });
    sendSuccess(res, { isExistingUser: !!user.passwordHash });
  } catch (e) { next(e); }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { countryCode, phoneNumber, otp, organizationId } = req.body;
    const user = await prisma.user.findFirst({ where: { phoneNumber, countryCode, organizationId } });
    if (!user) { sendError(res, 'User not found', 404); return; }
    const et = await prisma.emailToken.findFirst({ where: { userId: user.id, token: otp, type: 'OTP' }, orderBy: { createdAt: 'desc' } });
    if (!et || et.usedAt || et.expiresAt < new Date()) { sendError(res, 'Invalid or expired OTP', 400); return; }
    await prisma.emailToken.update({ where: { id: et.id }, data: { usedAt: new Date() } });
    await prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    const payload = { userId: user.id, role: 'STUDENT', organizationId: user.organizationId };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    sendSuccess(res, { accessToken, refreshToken, user: { id: user.id, phoneNumber, countryCode, username: user.username, role: 'STUDENT', organizationId, isVerified: true } });
  } catch (e) { next(e); }
};
