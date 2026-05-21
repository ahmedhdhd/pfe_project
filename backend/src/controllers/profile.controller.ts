import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

// ── Profile ───────────────────────────────────────────────

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { sendSuccess(res, null); return; }
    sendSuccess(res, { id: user.id, email: user.email, username: user.username, role: user.role, organizationId: user.organizationId, isVerified: user.isVerified, profileImg: user.profileImg, gender: user.gender, phoneNumber: user.phoneNumber, address: { city: user.addressCity, state: user.addressState, pincode: user.addressPincode } });
  } catch (e) { next(e); }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, profileImg, gender, phoneNumber, address } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { username, profileImg, gender, phoneNumber, addressCity: address?.city, addressState: address?.state, addressPincode: address?.pincode },
    });
    sendSuccess(res, user);
  } catch (e) { next(e); }
};
