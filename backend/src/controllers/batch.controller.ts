import { Request, Response, NextFunction } from 'express';
import { BatchLevel, Prisma, VideoType } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { verifyAccessToken } from '../utils/jwt';
import {
  BATCH_SUPPORTS_INTRO_VIDEO_TYPE,
  BATCH_SUPPORTS_INTRO_VIDEO_URL,
  BATCH_SUPPORTS_LEVEL,
  getOrganizationPaymentMode,
  normalizeBatchLevel,
  normalizeCertificateTemplateId,
  normalizeIntroVideoType,
  normalizeOptionalString,
  serializeBatch,
} from './batch.helpers';

// ── ADMIN ──────────────────────────────────────────────────

export const createBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { faq, introVideoUrl, introVideoType, ...rest } = req.body;
    // Publishing (status) is admin-only; teachers create drafts
    if (req.user!.role === 'TEACHER') delete rest.status;
    const { paymentMode } = await getOrganizationPaymentMode(
      req.user!.organizationId
    );
    const normalizedLevel =
      normalizeBatchLevel(rest.level) ||
      ((BatchLevel ? BatchLevel.BEGINNER : 'BEGINNER') as unknown as BatchLevel);
    const data: Prisma.BatchUncheckedCreateInput = {
      ...(rest as Prisma.BatchUncheckedCreateInput),
      organizationId: req.user!.organizationId,
      createdByUserId: req.user!.userId,
      class: normalizeOptionalString(rest.class),
      exam: normalizeOptionalString(rest.exam),
      language: normalizeOptionalString(rest.language),
      imageUrl: normalizeOptionalString(rest.imageUrl),
      categoryId: normalizeOptionalString(rest.categoryId),
      faqJson: faq || [],
      certificateTemplateId:
        normalizeCertificateTemplateId(rest.certificateTemplateId) || null,
      certificateTitle: normalizeOptionalString(rest.certificateTitle),
      certificateTemplateUrl: normalizeOptionalString(rest.certificateTemplateUrl),
      certificateIssuerName: normalizeOptionalString(rest.certificateIssuerName),
      certificateSignerName: normalizeOptionalString(rest.certificateSignerName),
      certificateSignerTitle: normalizeOptionalString(rest.certificateSignerTitle),
      certificateLinkedInOrgId: normalizeOptionalString(rest.certificateLinkedInOrgId),
      totalPrice:
        paymentMode === 'per_course' ? Math.max(0, Number(rest.totalPrice) || 0) : 0,
      discountPercentage:
        paymentMode === 'per_course'
          ? Math.min(100, Math.max(0, Number(rest.discountPercentage) || 0))
          : 0,
    };
    if (BATCH_SUPPORTS_LEVEL) {
      (data as Prisma.BatchUncheckedCreateInput & { level?: BatchLevel }).level =
        normalizedLevel;
    }
    if (BATCH_SUPPORTS_INTRO_VIDEO_URL) {
      (
        data as Prisma.BatchUncheckedCreateInput & { introVideoUrl?: string | null }
      ).introVideoUrl = normalizeOptionalString(introVideoUrl);
    }
    if (BATCH_SUPPORTS_INTRO_VIDEO_TYPE) {
      (
        data as Prisma.BatchUncheckedCreateInput & { introVideoType?: VideoType | null }
      ).introVideoType = normalizeIntroVideoType(
        introVideoType,
        normalizeOptionalString(introVideoUrl)
      );
    }
    const batch = await prisma.batch.create({
      data,
      include: {
        category: {
          include: {
            parent: true,
          },
        },
      },
    });
    sendSuccess(res, serializeBatch(batch), undefined, 201);
  } catch (e) { next(e); }
};

export const listBatches = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const batches = await prisma.batch.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        teachers: { include: { teacher: true } },
        _count: { select: { enrollments: true, subjects: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, batches.map((batch) => serializeBatch(batch)));
  } catch (e) { next(e); }
};

export const getBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const batch = await prisma.batch.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        teachers: { include: { teacher: true } },
        subjects: true,
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
        _count: { select: { enrollments: true } },
      },
    });
    if (!batch) { sendError(res, 'Batch not found', 404); return; }
    sendSuccess(res, serializeBatch(batch));
  } catch (e) { next(e); }
};

export const updateBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { faq, introVideoUrl, introVideoType, ...rest } = req.body;
    // Publishing (status) is admin-only; teachers cannot change it
    if (req.user!.role === 'TEACHER') delete rest.status;
    const hasIntroVideoUrl = Object.prototype.hasOwnProperty.call(req.body, 'introVideoUrl');
    const hasIntroVideoType = Object.prototype.hasOwnProperty.call(req.body, 'introVideoType');
    const { paymentMode } = await getOrganizationPaymentMode(
      req.user!.organizationId
    );
    const normalizedLevel = normalizeBatchLevel(rest.level);
    const data: Prisma.BatchUncheckedUpdateInput = {
      ...(rest as Prisma.BatchUncheckedUpdateInput),
      class: normalizeOptionalString(rest.class),
      exam: normalizeOptionalString(rest.exam),
      language: normalizeOptionalString(rest.language),
      imageUrl: normalizeOptionalString(rest.imageUrl),
      categoryId: normalizeOptionalString(rest.categoryId),
      faqJson: faq || undefined,
      certificateTemplateId:
        normalizeCertificateTemplateId(rest.certificateTemplateId) ?? null,
      certificateTitle: normalizeOptionalString(rest.certificateTitle) ?? null,
      certificateTemplateUrl: normalizeOptionalString(rest.certificateTemplateUrl) ?? null,
      certificateIssuerName: normalizeOptionalString(rest.certificateIssuerName) ?? null,
      certificateSignerName: normalizeOptionalString(rest.certificateSignerName) ?? null,
      certificateSignerTitle: normalizeOptionalString(rest.certificateSignerTitle) ?? null,
      certificateLinkedInOrgId: normalizeOptionalString(rest.certificateLinkedInOrgId) ?? null,
      totalPrice:
        paymentMode === 'per_course' ? Math.max(0, Number(rest.totalPrice) || 0) : 0,
      discountPercentage:
        paymentMode === 'per_course'
          ? Math.min(100, Math.max(0, Number(rest.discountPercentage) || 0))
          : 0,
    };
    if (BATCH_SUPPORTS_LEVEL) {
      (data as Prisma.BatchUncheckedUpdateInput & { level?: BatchLevel | null }).level =
        normalizedLevel;
    }
    if (BATCH_SUPPORTS_INTRO_VIDEO_URL && hasIntroVideoUrl) {
      (
        data as Prisma.BatchUncheckedUpdateInput & { introVideoUrl?: string | null }
      ).introVideoUrl = normalizeOptionalString(introVideoUrl) ?? null;
    }
    if (BATCH_SUPPORTS_INTRO_VIDEO_TYPE && (hasIntroVideoType || hasIntroVideoUrl)) {
      (
        data as Prisma.BatchUncheckedUpdateInput & { introVideoType?: VideoType | null }
      ).introVideoType =
        normalizeIntroVideoType(
          introVideoType,
          normalizeOptionalString(introVideoUrl)
        ) ?? null;
    }
    const batch = await prisma.batch.updateMany({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      data,
    });
    if (!batch.count) { sendError(res, 'Batch not found', 404); return; }
    sendSuccess(res, { message: 'Batch updated' });
  } catch (e) { next(e); }
};

export const deleteBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.batch.deleteMany({ where: { id: req.params.id, organizationId: req.user!.organizationId } });
    sendSuccess(res, { message: 'Batch deleted' });
  } catch (e) { next(e); }
};

// ── STUDENT ────────────────────────────────────────────────

export const listPublicBatches = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 12, 100);

    const language = typeof req.query.language === 'string' ? req.query.language.trim() : '';
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId.trim() : '';
    const level = typeof req.query.level === 'string' ? req.query.level.trim() : '';
    const price = typeof req.query.price === 'string' ? req.query.price.trim().toLowerCase() : '';
    const minRatingRaw = typeof req.query.minRating === 'string' ? req.query.minRating.trim() : '';
    const minRating = minRatingRaw !== '' && Number.isFinite(Number(minRatingRaw)) ? Number(minRatingRaw) : null;
    const minRatingCountRaw =
      typeof req.query.minRatingCount === 'string' ? req.query.minRatingCount.trim() : '';
    const minRatingCount =
      minRatingCountRaw !== '' && Number.isFinite(Number(minRatingCountRaw))
        ? Math.max(0, Math.floor(Number(minRatingCountRaw)))
        : null;
    const subdomain =
      typeof req.query.subdomain === 'string' ? req.query.subdomain.trim() : '';
    if (!subdomain) {
      sendError(res, 'subdomain is required', 400);
      return;
    }

    const org = await prisma.organization.findUnique({ where: { subdomain } });
    if (!org) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    const where: Prisma.BatchWhereInput = {
      organizationId: org.id,
      status: 'ACTIVE',
      ...(language ? { language: { equals: language, mode: 'insensitive' } } : {}),
      ...(categoryId
        ? {
            OR: [{ categoryId }, { category: { parentId: categoryId } }],
          }
        : {}),
      ...(BATCH_SUPPORTS_LEVEL && normalizeBatchLevel(level)
        ? { level: normalizeBatchLevel(level) }
        : {}),
    };

    const rawBatches = await prisma.batch.findMany({
      where,
      include: {
        category: { include: { parent: true } },
        reviews: { select: { rating: true, comment: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const enriched = rawBatches.map((batch) => serializeBatch(batch as any));

    const filtered = enriched.filter((batch) => {
      if (minRating !== null && typeof batch.averageRating === 'number') {
        if (batch.averageRating < minRating) return false;
      }

      if (minRatingCount !== null && typeof batch.ratingCount === 'number') {
        if (batch.ratingCount < minRatingCount) return false;
      }

      if (price === 'free' || price === 'paid') {
        const totalPrice = typeof batch.totalPrice === 'number' ? batch.totalPrice : 0;
        const discountPercentage =
          typeof batch.discountPercentage === 'number' ? batch.discountPercentage : 0;
        const finalPrice = Math.round(totalPrice * (1 - discountPercentage / 100));
        const isFree = finalPrice <= 0;
        if (price === 'free' && !isFree) return false;
        if (price === 'paid' && isFree) return false;
      }

      return true;
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const batches = filtered.slice(start, end);

    sendSuccess(res, {
      batches,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) { next(e); }
};

export const getMyBatches = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const enrollments = await prisma.batchEnrollment.findMany({
      where: { userId: req.user!.userId },
      include: { batch: { include: { subjects: { include: { _count: { select: { chapters: true } } } } } } },
    });
    sendSuccess(res, enrollments.map((e) => serializeBatch(e.batch)));
  } catch (e) { next(e); }
};

export const getPublicBatch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let viewer = null;

    if (token) {
      try {
        viewer = verifyAccessToken(token);
      } catch {
        viewer = null;
      }
    }

    const subdomain =
      typeof req.query.subdomain === 'string' ? req.query.subdomain.trim() : '';
    if (!subdomain) {
      sendError(res, 'subdomain is required', 400);
      return;
    }

    const org = await prisma.organization.findUnique({ where: { subdomain } });
    if (!org) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    const batch = await prisma.batch.findFirst({
      where: { id: req.params.id, organizationId: org.id },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        subjects: true,
        teachers: { include: { teacher: true } },
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
        _count: { select: { enrollments: true } },
      },
    });
    if (!batch) { sendError(res, 'Batch not found', 404); return; }

    const isPurchased = viewer
      ? !!(await prisma.batchEnrollment.findUnique({
          where: { batchId_userId: { batchId: batch.id, userId: viewer.userId } },
        }))
      : false;

    const canAccessUnpublished = viewer?.role === 'ADMIN' || viewer?.role === 'TEACHER' || isPurchased;

    if (batch.status !== 'ACTIVE' && !canAccessUnpublished) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    sendSuccess(res, serializeBatch({
      ...batch,
      isPurchased,
      isPublished: batch.status === 'ACTIVE',
      viewerReview:
        viewer && Array.isArray(batch.reviews)
          ? batch.reviews.find((review) => review.userId === viewer.userId)
          : null,
    }));
  } catch (e) { next(e); }
};
