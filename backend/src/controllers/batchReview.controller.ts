import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { normalizeOptionalString, serializeReview, serializeReviewsSummary } from './batch.helpers';

export const listBatchReviews = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const batch = await prisma.batch.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profileImg: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!batch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    sendSuccess(res, {
      reviews: batch.reviews.map(serializeReview),
      ...serializeReviewsSummary(batch.reviews),
    });
  } catch (e) { next(e); }
};

export const createOrUpdateBatchReview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { rating, comment } = req.body as { rating?: number; comment?: string };
    const parsedRating =
      typeof rating === 'number' ? rating : Number(rating);

    if (req.user?.role !== 'STUDENT') {
      sendError(res, 'Student access required', 403);
      return;
    }

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      sendError(res, 'Rating must be an integer between 1 and 5', 400);
      return;
    }

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    const enrollment = await prisma.batchEnrollment.findUnique({
      where: {
        batchId_userId: {
          batchId,
          userId: req.user.userId,
        },
      },
    });

    if (!enrollment) {
      sendError(res, 'Enroll in this course before leaving an evaluation', 403);
      return;
    }

    const review = await prisma.batchReview.upsert({
      where: {
        batchId_userId: {
          batchId,
          userId: req.user.userId,
        },
      },
      create: {
        batchId,
        userId: req.user.userId,
        rating: parsedRating,
        comment: normalizeOptionalString(comment) || null,
      },
      update: {
        rating: parsedRating,
        comment: normalizeOptionalString(comment) || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImg: true,
          },
        },
      },
    });

    sendSuccess(res, serializeReview(review), 'Evaluation saved successfully');
  } catch (e) { next(e); }
};
