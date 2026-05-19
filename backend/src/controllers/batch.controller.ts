import { Request, Response, NextFunction } from 'express';
import { BatchLevel, Prisma, VideoType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { verifyAccessToken } from '../utils/jwt';
import {
  buildFlouciCallbackUrl,
  createFlouciPayment,
  resolveFlouciCredentials,
  verifyFlouciPayment,
} from '../utils/flouci';
import { createKonnectPayment, verifyKonnectPayment } from '../utils/konnect';
import { createPaymeePayment, verifyPaymeePayment } from '../utils/paymee';
import { getOrderBatchIds, grantOrderEntitlements } from './order.controller';

const PAYMENT_CURRENCY = 'TND';
const toMillimes = (amount: number) => Math.max(0, Math.round(amount * 1000));
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const getOrganizationPaymentMode = async (organizationId: string) => {
  const config = await prisma.organizationConfig.findUnique({
    where: { organizationId },
    select: { paymentMode: true, subscriptionType: true },
  });

  return {
    paymentMode: config?.paymentMode || 'per_course',
    subscriptionType: config?.subscriptionType || 'onetime',
  };
};

const hasActiveSubscription = async (
  userId: string,
  organizationId: string,
  subscriptionType: string
) => {
  const successfulOrder = await prisma.order.findFirst({
    where: {
      userId,
      organizationId,
      paymentProvider: { in: ['KONNECT', 'PAYMEE'] },
      paymentStatus: 'SUCCESS',
      receiptId: { startsWith: 'sub_' },
    },
    orderBy: { completedAt: 'desc' },
  });

  if (!successfulOrder?.completedAt) {
    return false;
  }

  if (subscriptionType !== 'monthly') {
    return true;
  }

  return new Date() < new Date(successfulOrder.completedAt.getTime() + THIRTY_DAYS_MS);
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const BATCH_LEVEL_VALUES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
type BatchLevelString = (typeof BATCH_LEVEL_VALUES)[number];
const BATCH_SUPPORTS_LEVEL = Prisma.dmmf.datamodel.models.some(
  (model) =>
    model.name === 'Batch' && model.fields.some((field) => field.name === 'level')
);
const BATCH_SUPPORTS_INTRO_VIDEO_URL = Prisma.dmmf.datamodel.models.some(
  (model) =>
    model.name === 'Batch' &&
    model.fields.some((field) => field.name === 'introVideoUrl')
);
const BATCH_SUPPORTS_INTRO_VIDEO_TYPE = Prisma.dmmf.datamodel.models.some(
  (model) =>
    model.name === 'Batch' &&
    model.fields.some((field) => field.name === 'introVideoType')
);

const isYouTubeUrl = (value?: string): boolean =>
  typeof value === 'string' && /youtu\.be|youtube\.com/i.test(value);

const isHlsUrl = (value?: string): boolean =>
  typeof value === 'string' && /\.m3u8($|[?#])/i.test(value);

const normalizeBatchLevel = (value: unknown): BatchLevel | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  if (!BATCH_LEVEL_VALUES.includes(normalized as BatchLevelString)) {
    return undefined;
  }

  // Prisma Client may be temporarily out of sync in dev; avoid crashing by
  // falling back to string values which Prisma accepts for enums.
  if (!BatchLevel) {
    return normalized as unknown as BatchLevel;
  }

  if (normalized === 'BEGINNER') return BatchLevel.BEGINNER;
  if (normalized === 'INTERMEDIATE') return BatchLevel.INTERMEDIATE;
  if (normalized === 'ADVANCED') return BatchLevel.ADVANCED;
  return undefined;
};

const normalizeIntroVideoType = (
  value: unknown,
  url?: string
): VideoType | undefined => {
  if (isYouTubeUrl(url)) return VideoType.YOUTUBE;
  if (isHlsUrl(url)) return VideoType.HLS;

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === 'YOUTUBE') return VideoType.YOUTUBE;
  if (normalized === 'HLS') return VideoType.HLS;
  return undefined;
};

const normalizeFaq = (value: unknown): Array<{ title: string; description: string }> => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const faq = item as { title?: unknown; description?: unknown };
      return {
        title: typeof faq.title === 'string' ? faq.title : '',
        description: typeof faq.description === 'string' ? faq.description : '',
      };
    })
    .filter((item): item is { title: string; description: string } => {
      return !!item && (item.title.trim().length > 0 || item.description.trim().length > 0);
    });
};

const CERTIFICATE_TEMPLATE_IDS = [
  'classic-border',
  'modern-ribbon',
  'seal-elegant',
  'minimal-grid',
] as const;

type CertificateTemplateId = (typeof CERTIFICATE_TEMPLATE_IDS)[number];

const DEFAULT_CERTIFICATE_TEMPLATE_ID: CertificateTemplateId = 'classic-border';
const DEFAULT_CERTIFICATE_PRIMARY_COLOR = '#4f46e5';
const DEFAULT_CERTIFICATE_SECONDARY_COLOR = '#0ea5e9';

const normalizeCertificateTemplateId = (
  value: unknown
): CertificateTemplateId | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim() as CertificateTemplateId;
  return CERTIFICATE_TEMPLATE_IDS.includes(trimmed) ? trimmed : undefined;
};

const parseThemeColors = (
  value: unknown
): { primaryColor: string; secondaryColor: string } => {
  if (!value || typeof value !== 'object') {
    return {
      primaryColor: DEFAULT_CERTIFICATE_PRIMARY_COLOR,
      secondaryColor: DEFAULT_CERTIFICATE_SECONDARY_COLOR,
    };
  }

  const theme = value as { primaryColor?: unknown; secondaryColor?: unknown };
  const primaryColor =
    typeof theme.primaryColor === 'string' && theme.primaryColor.trim() !== ''
      ? theme.primaryColor
      : DEFAULT_CERTIFICATE_PRIMARY_COLOR;
  const secondaryColor =
    typeof theme.secondaryColor === 'string' && theme.secondaryColor.trim() !== ''
      ? theme.secondaryColor
      : DEFAULT_CERTIFICATE_SECONDARY_COLOR;

  return { primaryColor, secondaryColor };
};

const resolveCertificateTemplateId = (value: unknown): CertificateTemplateId =>
  normalizeCertificateTemplateId(value) || DEFAULT_CERTIFICATE_TEMPLATE_ID;

const resolveCertificateTitle = (batchName: unknown, title: unknown): string => {
  if (typeof title === 'string' && title.trim() !== '') {
    return title;
  }

  if (typeof batchName === 'string' && batchName.trim() !== '') {
    return `${batchName} Certificate`;
  }

  return 'Course Certificate';
};

const serializeBatch = <T extends Record<string, unknown>>(batch: T) => ({
  ...batch,
  faq: normalizeFaq(batch.faqJson),
  certificate: serializeCertificateConfig(batch),
  ...serializeReviewsSummary(
    Array.isArray(batch.reviews) ? batch.reviews as BatchReviewRecord[] : []
  ),
  reviews: Array.isArray(batch.reviews)
    ? (batch.reviews as BatchReviewRecord[]).map(serializeReview)
    : undefined,
  certificateIssue:
    batch.certificateIssue && typeof batch.certificateIssue === 'object'
      ? serializeCertificateIssue(batch.certificateIssue as BatchCertificateIssueRecord)
      : null,
  certificateIssues: Array.isArray(batch.certificateIssues)
    ? (batch.certificateIssues as BatchCertificateIssueRecord[]).map(
        serializeCertificateIssue
      )
    : undefined,
  viewerReview:
    batch.viewerReview && typeof batch.viewerReview === 'object'
      ? serializeReview(batch.viewerReview as BatchReviewRecord)
      : null,
});

type BatchReviewRecord = {
  id: string;
  batchId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    id: string;
    username?: string | null;
    profileImg?: string | null;
  } | null;
};

const serializeReview = (review: BatchReviewRecord) => ({
  id: review.id,
  batchId: review.batchId,
  userId: review.userId,
  rating: review.rating,
  comment: review.comment || '',
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  user: review.user
    ? {
        id: review.user.id,
        username: review.user.username || 'Student',
        profileImg: review.user.profileImg || null,
      }
    : undefined,
});

const serializeReviewsSummary = (reviews: BatchReviewRecord[]) => {
  const ratingCount = reviews.length;
  const averageRating = ratingCount
    ? Number(
        (
          reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount
        ).toFixed(1)
      )
    : 0;
  const reviewCount = reviews.filter(
    (review) => typeof review.comment === 'string' && review.comment.trim() !== ''
  ).length;

  return {
    averageRating,
    ratingCount,
    reviewCount,
  };
};

type BatchCertificateIssueRecord = {
  id: string;
  credentialId: string;
  batchId: string;
  userId: string;
  recipientNameSnapshot: string;
  batchNameSnapshot: string;
  certificateTitleSnapshot?: string | null;
  templateUrlSnapshot?: string | null;
  issuerNameSnapshot?: string | null;
  signerNameSnapshot?: string | null;
  signerTitleSnapshot?: string | null;
  linkedInOrgIdSnapshot?: string | null;
  progressPercentage: number;
  issuedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  templateId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
};

const serializeCertificateIssue = (issue: BatchCertificateIssueRecord) => ({
  id: issue.id,
  credentialId: issue.credentialId,
  batchId: issue.batchId,
  userId: issue.userId,
  recipientName: issue.recipientNameSnapshot,
  batchName: issue.batchNameSnapshot,
  certificateTitle:
    issue.certificateTitleSnapshot ||
    resolveCertificateTitle(issue.batchNameSnapshot, issue.certificateTitleSnapshot),
  templateId: resolveCertificateTemplateId(issue.templateId),
  issuerName: issue.issuerNameSnapshot || issue.organizationName || 'TeslaAcademy',
  signerName: issue.signerNameSnapshot || null,
  signerTitle: issue.signerTitleSnapshot || null,
  linkedInOrgId: issue.linkedInOrgIdSnapshot || null,
  organizationName: issue.organizationName || 'TeslaAcademy',
  organizationSlug: issue.organizationSlug || null,
  logoUrl: issue.logoUrl || null,
  primaryColor: issue.primaryColor || DEFAULT_CERTIFICATE_PRIMARY_COLOR,
  secondaryColor: issue.secondaryColor || DEFAULT_CERTIFICATE_SECONDARY_COLOR,
  progressPercentage: issue.progressPercentage,
  issuedAt: issue.issuedAt,
  createdAt: issue.createdAt,
  updatedAt: issue.updatedAt,
});

const serializeCertificateConfig = <T extends Record<string, unknown>>(batch: T) => ({
  enabled: Boolean(batch.certificateEnabled),
  title: resolveCertificateTitle(batch.name, batch.certificateTitle),
  templateId: resolveCertificateTemplateId(batch.certificateTemplateId),
  linkedInOrgId:
    typeof batch.certificateLinkedInOrgId === 'string' &&
    batch.certificateLinkedInOrgId.trim() !== ''
      ? batch.certificateLinkedInOrgId
      : null,
});

const certificateConfigIsReady = (batch: {
  certificateEnabled: boolean;
  certificateTemplateId?: string | null;
}) => batch.certificateEnabled && !!resolveCertificateTemplateId(batch.certificateTemplateId);

type CertificateContextBatch = {
  name: string;
  certificateTitle?: string | null;
  certificateTemplateId?: string | null;
  certificateLinkedInOrgId?: string | null;
  organization?: {
    name?: string | null;
    slug?: string | null;
    config?: {
      themeJson?: unknown;
      logoUrl?: string | null;
    } | null;
  } | null;
  createdByUser?: {
    username?: string | null;
  } | null;
  teachers?: Array<{
    teacher?: {
      name?: string | null;
    } | null;
  }>;
};

const buildCertificateIssuePayload = (
  issue: BatchCertificateIssueRecord,
  batch: CertificateContextBatch
) => {
  const { primaryColor, secondaryColor } = parseThemeColors(
    batch.organization?.config?.themeJson
  );
  const signerName =
    batch.createdByUser?.username ||
    batch.teachers?.[0]?.teacher?.name ||
    issue.signerNameSnapshot ||
    batch.organization?.name ||
    'TeslaAcademy';

  return {
    ...issue,
    certificateTitleSnapshot:
      issue.certificateTitleSnapshot ||
      resolveCertificateTitle(batch.name, batch.certificateTitle),
    templateId: batch.certificateTemplateId,
    linkedInOrgIdSnapshot:
      issue.linkedInOrgIdSnapshot || batch.certificateLinkedInOrgId || null,
    issuerNameSnapshot: batch.organization?.name || issue.issuerNameSnapshot || 'TeslaAcademy',
    signerNameSnapshot: signerName,
    organizationName: batch.organization?.name || 'TeslaAcademy',
    organizationSlug: batch.organization?.slug || null,
    logoUrl: batch.organization?.config?.logoUrl || null,
    primaryColor,
    secondaryColor,
  };
};

const getBatchProgressSummary = async (batchId: string, userId: string) => {
  const topics = await prisma.topic.findMany({
    where: { chapter: { subject: { batchId } } },
    select: { id: true },
  });
  const topicIds = topics.map((topic) => topic.id);

  if (topicIds.length === 0) {
    return {
      totalVideos: 0,
      completedVideos: 0,
      progressPercentage: 0,
      totalWatchTimeSeconds: 0,
      isCompleted: false,
    };
  }

  const contents = await prisma.content.findMany({
    where: { topicId: { in: topicIds }, type: 'Lecture' },
    select: { id: true },
  });
  const contentIds = contents.map((content) => content.id);

  if (contentIds.length === 0) {
    return {
      totalVideos: 0,
      completedVideos: 0,
      progressPercentage: 0,
      totalWatchTimeSeconds: 0,
      isCompleted: false,
    };
  }

  const [completedVideos, aggregate] = await Promise.all([
    prisma.contentProgress.count({
      where: { userId, contentId: { in: contentIds }, isCompleted: true },
    }),
    prisma.contentProgress.aggregate({
      where: { userId, contentId: { in: contentIds } },
      _sum: { watchedSeconds: true },
    }),
  ]);

  const progressPercentage = (completedVideos / contentIds.length) * 100;

  return {
    totalVideos: contentIds.length,
    completedVideos,
    progressPercentage,
    totalWatchTimeSeconds: aggregate._sum.watchedSeconds || 0,
    isCompleted: contentIds.length > 0 && completedVideos >= contentIds.length,
  };
};

const isCertificateProgressEligible = (progress: {
  totalVideos: number;
  completedVideos: number;
  progressPercentage: number;
  isCompleted: boolean;
}) =>
  progress.isCompleted ||
  (progress.totalVideos > 0 &&
    progress.completedVideos > 0 &&
    progress.completedVideos >= progress.totalVideos) ||
  Math.round(progress.progressPercentage) >= 100;

// ── ADMIN ──────────────────────────────────────────────────

export const createBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { faq, introVideoUrl, introVideoType, ...rest } = req.body;
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
        paymentMode === 'per_course' ? Number(rest.totalPrice) || 0 : 0,
      discountPercentage:
        paymentMode === 'per_course'
          ? Number(rest.discountPercentage) || 0
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
        paymentMode === 'per_course' ? Number(rest.totalPrice) || 0 : 0,
      discountPercentage:
        paymentMode === 'per_course'
          ? Number(rest.discountPercentage) || 0
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

export const updateBatchCertificateConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existingBatch = await prisma.batch.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
    });

    if (!existingBatch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    const enabled = Boolean(req.body?.enabled);
    const certificateTemplateId =
      normalizeCertificateTemplateId(req.body?.templateId) || null;

    if (enabled && !certificateTemplateId) {
      sendError(
        res,
        'Please choose one of the available certificate templates before enabling certificates',
        400
      );
      return;
    }

    const updatedBatch = await prisma.batch.update({
      where: { id: req.params.id },
      data: {
        certificateEnabled: enabled,
        certificateTemplateId,
        certificateTitle: null,
        certificateTemplateUrl: null,
        certificateIssuerName: null,
        certificateSignerName: null,
        certificateSignerTitle: null,
        certificateLinkedInOrgId: null,
      },
    });

    sendSuccess(
      res,
      { certificate: serializeCertificateConfig(updatedBatch) },
      'Certificate settings updated successfully'
    );
  } catch (e) {
    next(e);
  }
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
    // Extract org from subdomain param or query
    const subdomain = req.query.subdomain as string;
    let orgWhere = {};
    if (subdomain) {
      const org = await prisma.organization.findUnique({ where: { subdomain } });
      if (org) orgWhere = { organizationId: org.id };
    }

    const where: Prisma.BatchWhereInput = {
      ...orgWhere,
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

    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
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

export const getBatchCertificateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const userId = req.user!.userId;

    const [batch, enrollment] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          organization: {
            select: {
              name: true,
              slug: true,
              config: {
                select: {
                  themeJson: true,
                  logoUrl: true,
                },
              },
            },
          },
          createdByUser: {
            select: {
              username: true,
            },
          },
          teachers: {
            include: {
              teacher: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
          certificateIssues: {
            where: { userId },
            take: 1,
            orderBy: { issuedAt: 'desc' },
          },
        },
      }),
      prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: { batchId, userId },
        },
      }),
    ]);

    if (!batch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    if (!enrollment) {
      sendError(res, 'Enroll in this course first to access certificates', 403);
      return;
    }

    const progress = await getBatchProgressSummary(batchId, userId);
    const issue = batch.certificateIssues[0];
    const config = serializeCertificateConfig(batch);
    const configured = certificateConfigIsReady(batch);
    const eligible = configured && isCertificateProgressEligible(progress);

    sendSuccess(res, {
      batchId: batch.id,
      batchName: batch.name,
      certificate: issue
        ? serializeCertificateIssue(buildCertificateIssuePayload(issue, batch))
        : null,
      config,
      configured,
      progress,
      isCompleted: progress.isCompleted,
      eligible,
    });
  } catch (e) {
    next(e);
  }
};

export const claimBatchCertificate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const userId = req.user!.userId;

    const [batch, enrollment, user] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          organization: {
            select: {
              name: true,
              slug: true,
              config: {
                select: {
                  themeJson: true,
                  logoUrl: true,
                },
              },
            },
          },
          createdByUser: {
            select: {
              username: true,
            },
          },
          teachers: {
            include: {
              teacher: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
          certificateIssues: {
            where: { userId },
            take: 1,
            orderBy: { issuedAt: 'desc' },
          },
        },
      }),
      prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: { batchId, userId },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      }),
    ]);

    if (!batch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    if (!enrollment) {
      sendError(res, 'Enroll in this course first to claim a certificate', 403);
      return;
    }

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (!certificateConfigIsReady(batch)) {
      sendError(
        res,
        'This course certificate has not been configured yet',
        400
      );
      return;
    }

    const progress = await getBatchProgressSummary(batchId, userId);

    if (!isCertificateProgressEligible(progress)) {
      sendError(
        res,
        `Complete the course before claiming a certificate. Current progress: ${Math.round(progress.progressPercentage)}%`,
        400
      );
      return;
    }

    const existingIssue = batch.certificateIssues[0];

    if (existingIssue) {
      sendSuccess(res, {
        certificate: serializeCertificateIssue(
          buildCertificateIssuePayload(existingIssue, batch)
        ),
        progress,
      });
      return;
    }

    const issue = await prisma.batchCertificateIssue.create({
      data: {
        batchId: batch.id,
        userId,
        recipientNameSnapshot: user.username,
        batchNameSnapshot: batch.name,
        certificateTitleSnapshot: resolveCertificateTitle(
          batch.name,
          batch.certificateTitle
        ),
        templateUrlSnapshot: null,
        issuerNameSnapshot: batch.organization.name,
        signerNameSnapshot:
          batch.createdByUser?.username ||
          batch.teachers?.[0]?.teacher?.name ||
          batch.certificateSignerName ||
          batch.organization.name,
        signerTitleSnapshot: null,
        linkedInOrgIdSnapshot: batch.certificateLinkedInOrgId,
        progressPercentage: progress.progressPercentage,
      },
    });

    sendSuccess(
      res,
      {
        certificate: serializeCertificateIssue(
          buildCertificateIssuePayload(issue, batch)
        ),
        progress,
      },
      'Certificate issued successfully',
      201
    );
  } catch (e) {
    next(e);
  }
};

export const getPublicCertificateIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issue = await prisma.batchCertificateIssue.findUnique({
      where: { credentialId: req.params.credentialId },
      include: {
        batch: {
          include: {
            organization: {
              select: {
                name: true,
                slug: true,
                config: {
                  select: {
                    themeJson: true,
                    logoUrl: true,
                  },
                },
              },
            },
            createdByUser: {
              select: {
                username: true,
              },
            },
            teachers: {
              include: {
                teacher: {
                  select: {
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!issue) {
      sendError(res, 'Certificate not found', 404);
      return;
    }

    sendSuccess(res, {
      certificate: serializeCertificateIssue(
        buildCertificateIssuePayload(issue, issue.batch)
      ),
      organization: issue.batch.organization,
      batch: {
        id: issue.batch.id,
        name: issue.batch.name,
        imageUrl: issue.batch.imageUrl,
      },
    });
  } catch (e) {
    next(e);
  }
};

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

export const checkoutBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) { sendError(res, 'Batch not found', 404); return; }
    if (batch.status !== 'ACTIVE') { sendError(res, 'This course is not published yet', 400); return; }

    const alreadyEnrolled = await prisma.batchEnrollment.findUnique({ where: { batchId_userId: { batchId, userId: req.user!.userId } } });
    if (alreadyEnrolled) { sendError(res, 'Already enrolled', 409); return; }

    const discounted = batch.totalPrice * (1 - batch.discountPercentage / 100);
    const amountMillimes = toMillimes(discounted);
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId: batch.organizationId } }) as any;
    if ((config?.paymentMode || 'per_course') !== 'per_course') {
      sendError(res, 'Per-course checkout is not enabled for this organization', 400);
      return;
    }
    const order = await prisma.order.create({
      data: {
        organizationId: batch.organizationId,
        userId: req.user!.userId,
        entityType: 'BATCH',
        entityId: batchId,
        amount: discounted,
        currency: PAYMENT_CURRENCY,
        paymentProvider: 'FLOUCI',
        receiptId: uuidv4(),
        paymentStatus: 'PENDING',
      },
    });

    try {
      const { publicKey, privateKey } = resolveFlouciCredentials(config || undefined);
      const payment = await createFlouciPayment({
        amountMillimes,
        publicKey,
        privateKey,
        trackingId: order.id,
        clientId: req.user!.userId,
        imageUrl: config?.logoUrl || undefined,
        successLink: buildFlouciCallbackUrl({
          orderId: order.id,
          type: 'batch',
          entityId: batchId,
          status: 'success',
        }),
        failLink: buildFlouciCallbackUrl({
          orderId: order.id,
          type: 'batch',
          entityId: batchId,
          status: 'failed',
        }),
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { providerOrderId: payment.paymentId },
      });

      sendSuccess(res, {
        orderId: order.id,
        paymentId: payment.paymentId,
        paymentLink: payment.link,
        currency: PAYMENT_CURRENCY,
        amount: amountMillimes,
      });
    } catch (error) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'Failed to initialize Flouci payment',
        },
      });
      throw error;
    }
  } catch (e) { next(e); }
};

export const verifyBatchPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.body;
    if (typeof orderId !== 'string' || !orderId.trim()) { sendError(res, 'Order ID is required', 400); return; }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== req.user!.userId) { sendError(res, 'Order not found', 404); return; }
    if (!order.providerOrderId) { sendError(res, 'Payment session not found for this order', 400); return; }

      if (order.paymentStatus === 'SUCCESS') {
        await grantOrderEntitlements(prisma, order);
        sendSuccess(res, {
          verified: true,
          status: 'SUCCESS',
          message: 'Payment already verified, enrolled successfully',
          enrolledBatchIds: getOrderBatchIds(order),
        });
        return;
      }

    const config = await prisma.organizationConfig.findUnique({ where: { organizationId: order.organizationId } }) as any;
    const { publicKey, privateKey } = resolveFlouciCredentials(config || undefined);
    const payment = await verifyFlouciPayment({
      paymentId: order.providerOrderId,
      publicKey,
      privateKey,
    });

    if (payment.status !== 'SUCCESS') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: payment.status === 'PENDING' ? 'PENDING' : 'FAILED',
          failureReason:
            payment.status === 'PENDING'
              ? 'Payment is still pending confirmation'
              : `Flouci payment status: ${payment.status}`,
          providerPaymentId: payment.orderNumber || order.providerPaymentId,
          providerSignature: payment.approvalCode || order.providerSignature,
          completedAt: payment.status === 'PENDING' ? null : order.completedAt,
        },
      });

      sendSuccess(res, {
        verified: false,
        status: payment.status,
        message:
          payment.status === 'PENDING'
            ? 'Your payment is still pending. Please check again in a moment.'
            : 'Your payment was not completed successfully.',
      });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: 'FLOUCI',
        paymentStatus: 'SUCCESS',
        providerPaymentId: payment.orderNumber || order.providerOrderId,
        providerSignature: payment.approvalCode || undefined,
        failureReason: null,
        completedAt: new Date(),
      },
    });
      await grantOrderEntitlements(prisma, order);
      sendSuccess(res, {
        verified: true,
        status: 'SUCCESS',
        message: 'Payment verified, enrolled successfully',
        enrolledBatchIds: getOrderBatchIds(order),
      });
  } catch (e) { next(e); }
};

export const konnectCheckoutBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) { sendError(res, 'Batch not found', 404); return; }
    if (batch.status !== 'ACTIVE') { sendError(res, 'This course is not published yet', 400); return; }

    const alreadyEnrolled = await prisma.batchEnrollment.findUnique({ where: { batchId_userId: { batchId, userId: req.user!.userId } } });
    if (alreadyEnrolled) { sendError(res, 'Already enrolled', 409); return; }

    const discounted = batch.totalPrice * (1 - batch.discountPercentage / 100);
    const amountMillimes = toMillimes(discounted);
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId: batch.organizationId } }) as any;
    if ((config?.paymentMode || 'per_course') !== 'per_course') {
      sendError(res, 'Per-course checkout is not enabled for this organization', 400);
      return;
    }
    
    const gateway = (config?.paymentGateway || 'konnect').toLowerCase();
    if (gateway === 'flouci' && (!config?.razorpayKeyId || !config?.razorpayKeySecret)) {
      sendError(res, 'Flouci payment is not configured for this organization', 400); return;
    }
    if (gateway === 'konnect' && (!config?.konnectApiKey || !config?.konnectWalletId)) {
      sendError(res, 'Konnect payment is not configured for this organization', 400); return;
    }
    if (gateway === 'paymee' && !config?.paymeeApiToken) {
      sendError(res, 'Paymee payment is not configured for this organization', 400); return;
    }

    const order = await prisma.order.create({
      data: {
        organizationId: batch.organizationId,
        userId: req.user!.userId,
        entityType: 'BATCH',
        entityId: batchId,
        amount: discounted,
        currency: PAYMENT_CURRENCY,
        paymentProvider: gateway === 'flouci' ? 'FLOUCI' : gateway === 'paymee' ? 'PAYMEE' : 'KONNECT',
        receiptId: uuidv4(),
        paymentStatus: 'PENDING',
      },
    });

    try {
      if (gateway === 'flouci') {
        const { publicKey, privateKey } = resolveFlouciCredentials(config || undefined);
        const payment = await createFlouciPayment({
          amountMillimes,
          publicKey,
          privateKey,
          trackingId: order.id,
          clientId: req.user!.userId,
          imageUrl: config?.logoUrl || undefined,
          successLink: buildFlouciCallbackUrl({
            orderId: order.id,
            type: 'batch',
            entityId: batchId,
            status: 'success',
          }),
          failLink: buildFlouciCallbackUrl({
            orderId: order.id,
            type: 'batch',
            entityId: batchId,
            status: 'failed',
          }),
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { providerOrderId: payment.paymentId },
        });

        sendSuccess(res, {
          payUrl: payment.link,
          paymentLink: payment.link,
          orderId: order.id,
          paymentId: payment.paymentId,
          paymentRef: payment.paymentId,
          currency: PAYMENT_CURRENCY,
          amount: amountMillimes,
          gateway: 'flouci',
        });
      } else if (gateway === 'paymee') {
        const payment = await createPaymeePayment({
          apiToken: config.paymeeApiToken,
          vendor: config.paymeeVendor,
          amount: discounted,
          note: `Batch payment - ${order.id}`,
          firstName: req.user!.email?.split('@')[0] || 'Learner',
          lastName: req.user!.email?.split('@')[0] || 'Learner',
          email: req.user!.email || 'student@example.com',
          phone: '00000000',
          orderId: order.id,
          returnUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`,
          cancelUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`,
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { providerOrderId: payment.token },
        });

        sendSuccess(res, {
          payUrl: payment.payUrl,
          paymentRef: payment.token,
        });
      } else {
        const payment = await createKonnectPayment(config.konnectApiKey, {
          receiverWalletId: config.konnectWalletId,
          amount: amountMillimes,
          token: config.currency === 'USD' || config.currency === 'EUR' ? config.currency : 'TND',
          orderId: order.id,
          firstName: req.user!.email?.split('@')[0] || 'Learner',
          email: req.user!.email || undefined,
          successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`,
          failUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`,
          theme: config.themeJson ? 'dark' : 'light',
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { providerOrderId: payment.paymentRef },
        });

        sendSuccess(res, {
          payUrl: payment.payUrl,
          paymentRef: payment.paymentRef,
        });
      }
    } catch (error) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          failureReason:
            error instanceof Error
              ? error.message
              : `Failed to initialize ${gateway === 'flouci' ? 'Flouci' : gateway === 'paymee' ? 'Paymee' : 'Konnect'} payment`,
        },
      });
      throw error;
    }
  } catch (e) { next(e); }
};

export const konnectVerifyBatchPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentRef } = req.body;
    if (typeof paymentRef !== 'string' || !paymentRef.trim()) { sendError(res, 'Payment Ref is required', 400); return; }
    
    const order = await prisma.order.findFirst({ where: { providerOrderId: paymentRef } });
    if (!order || order.userId !== req.user!.userId) { sendError(res, 'Order not found', 404); return; }

      if (order.paymentStatus === 'SUCCESS') {
        await grantOrderEntitlements(prisma, order);
        sendSuccess(res, {
          verified: true,
          status: 'SUCCESS',
          message: 'Payment already verified, enrolled successfully',
          enrolledBatchIds: getOrderBatchIds(order),
        });
        return;
      }

    const config = await prisma.organizationConfig.findUnique({ where: { organizationId: order.organizationId } }) as any;
    const gateway =
      order.paymentProvider === 'FLOUCI'
        ? 'flouci'
        : order.paymentProvider === 'PAYMEE'
        ? 'paymee'
        : (config?.paymentGateway || 'konnect').toLowerCase();
    let status = '';
    let providerPaymentId: string | null = null;
    if (gateway === 'flouci') {
      const { publicKey, privateKey } = resolveFlouciCredentials(config || undefined);
      const payment = await verifyFlouciPayment({
        paymentId: paymentRef,
        publicKey,
        privateKey,
      });
      status =
        payment.status === 'SUCCESS'
          ? 'completed'
          : payment.status === 'PENDING'
          ? 'pending'
          : 'failed';
      providerPaymentId = payment.orderNumber || order.providerOrderId;
    } else if (gateway === 'paymee') {
      if (!config?.paymeeApiToken) {
        sendError(res, 'Paymee payment is not configured', 400); return;
      }
      const paymentDetails = await verifyPaymeePayment({
        apiToken: config.paymeeApiToken,
        token: paymentRef,
      });
      status = paymentDetails.paid ? 'completed' : paymentDetails.status;
      providerPaymentId = paymentDetails.transactionId;
    } else {
      if (!config?.konnectApiKey) {
        sendError(res, 'Konnect payment is not configured', 400); return;
      }
      const paymentDetails = await verifyKonnectPayment(config.konnectApiKey, paymentRef);
      status = paymentDetails.payment.status;
      providerPaymentId = paymentDetails.payment.id;
    }

    if (status !== 'completed') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: status === 'pending' ? 'PENDING' : 'FAILED',
          failureReason: status === 'pending' ? 'Payment is still pending' : `Konnect status: ${status}`,
          providerPaymentId,
          completedAt: status === 'pending' ? null : order.completedAt,
        },
      });

      sendSuccess(res, {
        verified: false,
        status: status.toUpperCase(),
        message: status === 'pending' ? 'Your payment is still pending. Please check again in a moment.' : 'Your payment was not completed successfully.',
      });
      return;
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentProvider: gateway === 'flouci' ? 'FLOUCI' : gateway === 'paymee' ? 'PAYMEE' : 'KONNECT',
        paymentStatus: 'SUCCESS',
        providerPaymentId,
        failureReason: null,
        completedAt: new Date(),
      },
    });

      await grantOrderEntitlements(prisma, order);

      sendSuccess(res, {
        verified: true,
        status: 'SUCCESS',
        message: 'Payment verified, enrolled successfully',
        enrolledBatchIds: getOrderBatchIds(order),
      });
  } catch (e) { next(e); }
};

export const enrollFree = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) { sendError(res, 'Batch not found', 404); return; }
    if (batch.status !== 'ACTIVE') { sendError(res, 'This course is not published yet', 400); return; }
    const { paymentMode, subscriptionType } = await getOrganizationPaymentMode(
      batch.organizationId
    );
    const discounted = batch.totalPrice * (1 - batch.discountPercentage / 100);
    const canEnrollWithoutCoursePayment =
      paymentMode === 'free' ||
      discounted <= 0 ||
      (paymentMode === 'subscription' &&
        (await hasActiveSubscription(
          req.user!.userId,
          batch.organizationId,
          subscriptionType
        )));

    if (!canEnrollWithoutCoursePayment) {
      sendError(res, 'This course requires payment or an active subscription', 400);
      return;
    }
    const existingEnrollment = await prisma.batchEnrollment.findUnique({ where: { batchId_userId: { batchId, userId: req.user!.userId } } });
    if (existingEnrollment) {
      sendSuccess(res, { message: 'Already enrolled' });
      return;
    }
    await prisma.batchEnrollment.create({ data: { batchId, userId: req.user!.userId, isFree: paymentMode !== 'per_course' || discounted <= 0 } });
    sendSuccess(res, { message: 'Enrolled successfully' });
  } catch (e) { next(e); }
};
