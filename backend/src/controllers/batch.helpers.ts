import { BatchLevel, Prisma, VideoType } from '@prisma/client';
import prisma from '../utils/prisma';
import { normalizePaymentGateway } from '../utils/stripeConnect';

// ── Payment mode ───────────────────────────────────────────

export const PAYMENT_CURRENCY = 'TND';
export const toMillimes = (amount: number) => Math.max(0, Math.round(amount * 1000));
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const isStripeConfigured = (config: { paymentGateway?: unknown }) =>
  normalizePaymentGateway(config?.paymentGateway) === 'STRIPE';

export const getOrganizationPaymentMode = async (organizationId: string) => {
  const config = await prisma.organizationConfig.findUnique({
    where: { organizationId },
    select: {
      paymentMode: true,
      subscriptionType: true,
      paymentGateway: true,
      stripeAccountId: true,
    } as any,
  });

  return {
    paymentMode: config?.paymentMode || 'per_course',
    subscriptionType: config?.subscriptionType || 'onetime',
  };
};

export const hasActiveSubscription = async (
  userId: string,
  organizationId: string,
  subscriptionType: string
) => {
  const successfulOrder = await prisma.order.findFirst({
    where: {
      userId,
      organizationId,
      paymentProvider: { in: ['KONNECT', 'FLOUCI', 'STRIPE_CONNECT'] },
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

// ── String / value normalizers ─────────────────────────────

export const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const BATCH_LEVEL_VALUES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
type BatchLevelString = (typeof BATCH_LEVEL_VALUES)[number];
export const BATCH_SUPPORTS_LEVEL = Prisma.dmmf.datamodel.models.some(
  (model) =>
    model.name === 'Batch' && model.fields.some((field) => field.name === 'level')
);
export const BATCH_SUPPORTS_INTRO_VIDEO_URL = Prisma.dmmf.datamodel.models.some(
  (model) =>
    model.name === 'Batch' &&
    model.fields.some((field) => field.name === 'introVideoUrl')
);
export const BATCH_SUPPORTS_INTRO_VIDEO_TYPE = Prisma.dmmf.datamodel.models.some(
  (model) =>
    model.name === 'Batch' &&
    model.fields.some((field) => field.name === 'introVideoType')
);

export const isYouTubeUrl = (value?: string): boolean =>
  typeof value === 'string' && /youtu\.be|youtube\.com/i.test(value);

export const isHlsUrl = (value?: string): boolean =>
  typeof value === 'string' && /\.m3u8($|[?#])/i.test(value);

export const normalizeBatchLevel = (value: unknown): BatchLevel | undefined => {
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

export const normalizeIntroVideoType = (
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

export const normalizeFaq = (value: unknown): Array<{ title: string; description: string }> => {
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

// ── Certificates ────────────────────────────────────────────

export const CERTIFICATE_TEMPLATE_IDS = [
  'prestige-ivory',
  'executive-navy',
  'modern-minimal',
  'royal-burgundy',
] as const;

export type CertificateTemplateId = (typeof CERTIFICATE_TEMPLATE_IDS)[number];

const LEGACY_CERTIFICATE_TEMPLATE_IDS: Record<string, CertificateTemplateId> = {
  'classic-border': 'prestige-ivory',
  'modern-ribbon': 'executive-navy',
  'seal-elegant': 'royal-burgundy',
  'minimal-grid': 'modern-minimal',
};

export const DEFAULT_CERTIFICATE_TEMPLATE_ID: CertificateTemplateId = 'prestige-ivory';
export const DEFAULT_CERTIFICATE_PRIMARY_COLOR = '#1e3a5f';
export const DEFAULT_CERTIFICATE_SECONDARY_COLOR = '#c9a227';
export const DEFAULT_CERTIFICATE_HEADING = 'Certificate of Completion';

export const normalizeCertificateTemplateId = (
  value: unknown
): CertificateTemplateId | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (CERTIFICATE_TEMPLATE_IDS.includes(trimmed as CertificateTemplateId)) {
    return trimmed as CertificateTemplateId;
  }

  return LEGACY_CERTIFICATE_TEMPLATE_IDS[trimmed];
};

export const normalizeHexColor = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!/^#?[0-9a-fA-F]{6}$/.test(trimmed)) {
    return undefined;
  }

  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
};

export const parseThemeColors = (
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

export const resolveCertificateTemplateId = (value: unknown): CertificateTemplateId =>
  normalizeCertificateTemplateId(value) || DEFAULT_CERTIFICATE_TEMPLATE_ID;

export const resolveCertificateTitle = (batchName: unknown, title: unknown): string => {
  if (typeof title === 'string' && title.trim() !== '') {
    return title;
  }

  if (typeof batchName === 'string' && batchName.trim() !== '') {
    return `${batchName} Certificate`;
  }

  return 'Course Certificate';
};

// ── Serializers ─────────────────────────────────────────────

export const serializeBatch = <T extends Record<string, unknown>>(batch: T) => ({
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

export type BatchReviewRecord = {
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

export const serializeReview = (review: BatchReviewRecord) => ({
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

export const serializeReviewsSummary = (reviews: BatchReviewRecord[]) => {
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

export type BatchCertificateIssueRecord = {
  id: string;
  credentialId: string;
  batchId: string;
  userId: string;
  recipientNameSnapshot: string;
  batchNameSnapshot: string;
  certificateTitleSnapshot?: string | null;
  certificateHeading?: string | null;
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

export const serializeCertificateIssue = (issue: BatchCertificateIssueRecord) => ({
  id: issue.id,
  credentialId: issue.credentialId,
  batchId: issue.batchId,
  userId: issue.userId,
  recipientName: issue.recipientNameSnapshot,
  batchName: issue.batchNameSnapshot,
  certificateTitle:
    issue.certificateTitleSnapshot ||
    resolveCertificateTitle(issue.batchNameSnapshot, issue.certificateTitleSnapshot),
  heading:
    typeof issue.certificateHeading === 'string' && issue.certificateHeading.trim() !== ''
      ? issue.certificateHeading
      : DEFAULT_CERTIFICATE_HEADING,
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

export const serializeCertificateConfig = <T extends Record<string, unknown>>(batch: T) => ({
  enabled: Boolean(batch.certificateEnabled),
  title: resolveCertificateTitle(batch.name, batch.certificateTitle),
  heading:
    typeof batch.certificateHeading === 'string' && batch.certificateHeading.trim() !== ''
      ? batch.certificateHeading
      : DEFAULT_CERTIFICATE_HEADING,
  templateId: resolveCertificateTemplateId(batch.certificateTemplateId),
  issuerName:
    typeof batch.certificateIssuerName === 'string' &&
    batch.certificateIssuerName.trim() !== ''
      ? batch.certificateIssuerName
      : null,
  signerName:
    typeof batch.certificateSignerName === 'string' &&
    batch.certificateSignerName.trim() !== ''
      ? batch.certificateSignerName
      : null,
  signerTitle:
    typeof batch.certificateSignerTitle === 'string' &&
    batch.certificateSignerTitle.trim() !== ''
      ? batch.certificateSignerTitle
      : null,
  primaryColor:
    normalizeHexColor(batch.certificatePrimaryColor) || DEFAULT_CERTIFICATE_PRIMARY_COLOR,
  secondaryColor:
    normalizeHexColor(batch.certificateSecondaryColor) ||
    DEFAULT_CERTIFICATE_SECONDARY_COLOR,
  linkedInOrgId:
    typeof batch.certificateLinkedInOrgId === 'string' &&
    batch.certificateLinkedInOrgId.trim() !== ''
      ? batch.certificateLinkedInOrgId
      : null,
});

export const certificateConfigIsReady = (batch: {
  certificateEnabled: boolean;
  certificateTemplateId?: string | null;
}) => batch.certificateEnabled && !!resolveCertificateTemplateId(batch.certificateTemplateId);

export type CertificateContextBatch = {
  name: string;
  certificateTitle?: string | null;
  certificateHeading?: string | null;
  certificateTemplateId?: string | null;
  certificateIssuerName?: string | null;
  certificateSignerName?: string | null;
  certificateSignerTitle?: string | null;
  certificatePrimaryColor?: string | null;
  certificateSecondaryColor?: string | null;
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

export const buildCertificateIssuePayload = (
  issue: BatchCertificateIssueRecord,
  batch: CertificateContextBatch
) => {
  const themeColors = parseThemeColors(batch.organization?.config?.themeJson);
  const primaryColor =
    normalizeHexColor(batch.certificatePrimaryColor) || themeColors.primaryColor;
  const secondaryColor =
    normalizeHexColor(batch.certificateSecondaryColor) || themeColors.secondaryColor;
  const signerName =
    batch.certificateSignerName?.trim() ||
    batch.createdByUser?.username ||
    batch.teachers?.[0]?.teacher?.name ||
    issue.signerNameSnapshot ||
    batch.organization?.name ||
    'Academic Team';
  const signerTitle =
    batch.certificateSignerTitle?.trim() || issue.signerTitleSnapshot || 'Course Creator';
  const issuerName =
    batch.certificateIssuerName?.trim() ||
    batch.organization?.name ||
    issue.issuerNameSnapshot ||
    'TeslaAcademy';
  const heading =
    batch.certificateHeading?.trim() || DEFAULT_CERTIFICATE_HEADING;

  return {
    ...issue,
    certificateTitleSnapshot:
      issue.certificateTitleSnapshot ||
      resolveCertificateTitle(batch.name, batch.certificateTitle),
    certificateHeading: heading,
    templateId: batch.certificateTemplateId,
    linkedInOrgIdSnapshot:
      issue.linkedInOrgIdSnapshot || batch.certificateLinkedInOrgId || null,
    issuerNameSnapshot: issuerName,
    signerNameSnapshot: signerName,
    signerTitleSnapshot: signerTitle,
    organizationName: batch.organization?.name || 'TeslaAcademy',
    organizationSlug: batch.organization?.slug || null,
    logoUrl: batch.organization?.config?.logoUrl || null,
    primaryColor,
    secondaryColor,
  };
};

// ── Progress ────────────────────────────────────────────────

export const getBatchProgressSummary = async (batchId: string, userId: string) => {
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

export const isCertificateProgressEligible = (progress: {
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
