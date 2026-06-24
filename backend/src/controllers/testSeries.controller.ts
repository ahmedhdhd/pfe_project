import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { createKonnectPayment, getKonnectCredentials, verifyKonnectPayment } from '../utils/konnect';
import {
  createStripeCheckoutSession,
  isStripeCurrencySupported,
  normalizePaymentGateway,
  retrieveStripeCheckoutSession,
} from '../utils/stripeConnect';

const PAYMENT_CURRENCY = 'TND';
const toMillimes = (amount: number) => Math.max(0, Math.round(amount * 1000));

const isStripeConnectConfigured = (config: { paymentGateway?: unknown; stripeAccountId?: string | null }) =>
  normalizePaymentGateway(config?.paymentGateway) === 'STRIPE_CONNECT' && !!config?.stripeAccountId;

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeSlug = (value: unknown, fallbackTitle?: unknown): string | undefined => {
  const candidate =
    normalizeOptionalString(value) || normalizeOptionalString(fallbackTitle);

  if (!candidate) {
    return undefined;
  }

  return candidate
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120);
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
      const title = normalizeOptionalString(faq.title) || '';
      const description = normalizeOptionalString(faq.description) || '';

      if (!title && !description) {
        return null;
      }

      return { title, description };
    })
    .filter((item): item is { title: string; description: string } => Boolean(item));
};

const normalizeDescriptionHtml = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return normalizeOptionalString(value);
  }

  if (value && typeof value === 'object') {
    const description = value as { html?: unknown };
    return normalizeOptionalString(description.html);
  }

  return undefined;
};

type CategoryRecord = {
  id: string;
  name: string;
  icon?: string | null;
  parentId?: string | null;
  parent?: CategoryRecord | null;
};

type SerializedCategory = {
  id: string;
  name: string;
  icon: string | null;
  parentId: string | null;
  parent: SerializedCategory | null;
};

const serializeCategory = (
  category?: CategoryRecord | null
): SerializedCategory | null =>
  category
    ? {
        id: category.id,
        name: category.name,
        icon: category.icon || null,
        parentId: category.parentId || null,
        parent: category.parent ? serializeCategory(category.parent) : null,
      }
    : null;

const getCategoryDisplayName = (category?: CategoryRecord | null) => {
  if (!category) {
    return undefined;
  }

  if (category.parent?.name) {
    return `${category.parent.name} / ${category.name}`;
  }

  return category.name;
};

const resolveCategory = async (
  organizationId: string,
  rawCategoryId: unknown
) => {
  const categoryId = normalizeOptionalString(rawCategoryId);

  if (!categoryId) {
    return null;
  }

  return prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
    },
    include: {
      parent: true,
    },
  });
};

const normalizeTestSeriesPayload = (
  body: Record<string, unknown>,
  options?: {
    organizationId?: string;
    category?: CategoryRecord | null;
  }
): Prisma.TestSeriesUncheckedCreateInput | Prisma.TestSeriesUncheckedUpdateInput => {
  const durationDays = Number(body.durationDays);
  const categoryId =
    options?.category?.id || normalizeOptionalString(body.categoryId);
  const examLabel =
    getCategoryDisplayName(options?.category) ||
    normalizeOptionalString(body.exam);

  const payload: Prisma.TestSeriesUncheckedCreateInput | Prisma.TestSeriesUncheckedUpdateInput = {
    ...(options?.organizationId ? { organizationId: options.organizationId } : {}),
    ...(normalizeOptionalString(body.title) ? { title: normalizeOptionalString(body.title)! } : {}),
    ...(categoryId ? { categoryId } : {}),
    description: normalizeDescriptionHtml(body.description),
    exam: examLabel,
    slug: normalizeSlug(body.slug, body.title),
    thumbnailUrl:
      normalizeOptionalString(body.imageUrl) ||
      normalizeOptionalString(body.thumbnailUrl),
    faqJson: normalizeFaq(body.faq) as Prisma.InputJsonValue,
    totalPrice: 0,
    discountPercentage: 0,
    isFree: true,
    durationDays:
      Number.isFinite(durationDays) && durationDays > 0 ? Math.floor(durationDays) : 365,
    isActive:
      typeof body.isActive === 'boolean'
        ? body.isActive
        : true,
    isPublished:
      typeof body.isPublished === 'boolean'
        ? body.isPublished
        : undefined,
  };

  if (
    body &&
    Object.prototype.hasOwnProperty.call(body, 'categoryId') &&
    !categoryId
  ) {
    payload.categoryId = null;
  }

  return payload;
};

const serializeTestSeries = <
  T extends {
    id: string;
    title: string;
    description?: string | null;
    exam?: string | null;
    category?: unknown;
    slug?: string | null;
    thumbnailUrl?: string | null;
    faqJson?: unknown;
    totalPrice: number;
    discountPercentage: number;
    isFree: boolean;
    durationDays?: number | null;
    isActive?: boolean | null;
    isPublished: boolean;
    tests?: Array<{ id: string }>;
    _count?: { tests?: number; enrollments?: number };
  } & Record<string, unknown>,
>(ts: T) => ({
  ...ts,
  description: ts.description
    ? {
        html: ts.description,
        features: [],
      }
    : undefined,
  slug: ts.slug || normalizeSlug(undefined, ts.title) || ts.id,
  imageUrl: ts.thumbnailUrl || undefined,
  category:
    ts.category && typeof ts.category === 'object'
      ? serializeCategory(ts.category as CategoryRecord)
      : null,
  exam:
    ts.category && typeof ts.category === 'object'
      ? getCategoryDisplayName(ts.category as CategoryRecord) || ts.exam || undefined
      : ts.exam || undefined,
  faq: normalizeFaq(ts.faqJson),
  totalPrice: 0,
  discountPercentage: 0,
  finalPrice: 0,
  discountedPrice: 0,
  isFree: true,
  durationDays: ts.durationDays ?? 365,
  isActive: ts.isActive ?? true,
  testCount:
    Array.isArray(ts.tests) ? ts.tests.length : ts._count?.tests ?? 0,
  enrollmentCount: ts._count?.enrollments ?? 0,
});

const normalizeTestPayload = (
  body: Record<string, unknown>
): Prisma.TestUncheckedCreateInput | Prisma.TestUncheckedUpdateInput => {
  const durationMinutes = Number(body.durationMinutes);
  const totalMarks = Number(body.totalMarks);
  const passingMarks = Number(body.passingMarks);
  const displayOrder = Number(body.displayOrder);

  return {
    ...(normalizeOptionalString(body.testSeriesId)
      ? { testSeriesId: normalizeOptionalString(body.testSeriesId)! }
      : {}),
    ...(normalizeOptionalString(body.title)
      ? { title: normalizeOptionalString(body.title)! }
      : {}),
    ...(normalizeSlug(body.slug, body.title)
      ? { slug: normalizeSlug(body.slug, body.title)! }
      : {}),
    description: normalizeDescriptionHtml(body.description),
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : 60,
    totalMarks: Number.isFinite(totalMarks) ? totalMarks : 100,
    passingMarks: Number.isFinite(passingMarks) ? passingMarks : 33,
    isFree: Boolean(body.isFree),
    isPublished:
      typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
    displayOrder: Number.isFinite(displayOrder) ? displayOrder : 0,
  };
};

const serializeTest = <
  T extends {
    description?: string | null;
    instructionsJson?: unknown;
  } & Record<string, unknown>,
>(
  test: T
) => ({
  ...test,
  description: test.description
    ? {
        html: test.description,
        topics: [],
      }
    : undefined,
  instructions:
    test.instructionsJson && typeof test.instructionsJson === 'object'
      ? test.instructionsJson
      : {},
  showAnswersAfterSubmit: true,
  allowReview: true,
  shuffleQuestions: false,
});

// ── Test Series ───────────────────────────────────────────

export const createTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const category = await resolveCategory(
      req.user!.organizationId,
      body.categoryId
    );

    if (
      Object.prototype.hasOwnProperty.call(body, 'categoryId') &&
      body.categoryId &&
      !category
    ) {
      sendError(res, 'Category not found', 404);
      return;
    }

    const ts = await prisma.testSeries.create({
      data: normalizeTestSeriesPayload(
        body,
        {
          organizationId: req.user!.organizationId,
          category,
        }
      ) as Prisma.TestSeriesUncheckedCreateInput,
      include: {
        category: {
          include: {
            parent: true,
          },
        },
      },
    });
    sendSuccess(res, serializeTestSeries(ts), undefined, 201);
  } catch (e) { next(e); }
};

export const listTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, categoryId, isActive } = req.query;
    const normalizedCategoryId =
      typeof categoryId === 'string' && categoryId.trim() !== ''
        ? categoryId.trim()
        : undefined;
    const normalizedIsActive =
      typeof isActive === 'string' ? isActive === 'true' : undefined;
    const where = {
      organizationId: req.user!.organizationId,
      ...(search ? { title: { contains: search as string, mode: 'insensitive' as const } } : {}),
      ...(typeof normalizedIsActive === 'boolean'
        ? { isActive: normalizedIsActive }
        : {}),
      ...(normalizedCategoryId
        ? {
            OR: [
              { categoryId: normalizedCategoryId },
              { category: { parentId: normalizedCategoryId } },
            ],
          }
        : {}),
    };
    const [list, total] = await Promise.all([
      prisma.testSeries.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            include: {
              parent: true,
            },
          },
          _count: { select: { tests: true, enrollments: true } },
        },
      }),
      prisma.testSeries.count({ where }),
    ]);
    sendSuccess(res, { list: list.map(serializeTestSeries), total });
  } catch (e) { next(e); }
};

export const getTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ts = await prisma.testSeries.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        tests: { orderBy: { displayOrder: 'asc' } },
        _count: { select: { enrollments: true, tests: true } },
      },
    });
    if (!ts) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, serializeTestSeries(ts));
  } catch (e) { next(e); }
};

export const updateTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const category = await resolveCategory(
      req.user!.organizationId,
      body.categoryId
    );

    if (
      Object.prototype.hasOwnProperty.call(body, 'categoryId') &&
      body.categoryId &&
      !category
    ) {
      sendError(res, 'Category not found', 404);
      return;
    }

    const ts = await prisma.testSeries.updateMany({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      data: normalizeTestSeriesPayload(body, {
        category,
      }) as Prisma.TestSeriesUncheckedUpdateInput,
    });
    if (!ts.count) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, { message: 'Updated' });
  } catch (e) { next(e); }
};

export const deleteTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.testSeries.deleteMany({ where: { id: req.params.id, organizationId: req.user!.organizationId } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

export const getTestSeriesStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id;
    const enrollments = await prisma.testSeriesEnrollment.count({ where: { testSeriesId: id } });
    const attempts = await prisma.testAttempt.count({ where: { test: { testSeriesId: id } } });
    sendSuccess(res, { enrollments, attempts });
  } catch (e) { next(e); }
};

// ── Tests ─────────────────────────────────────────────────

export const createTest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instructions } = req.body as Record<string, unknown>;
    const test = await prisma.test.create({
      data: {
        ...(normalizeTestPayload(req.body as Record<string, unknown>) as Prisma.TestUncheckedCreateInput),
        instructionsJson:
          instructions && typeof instructions === 'object'
            ? (instructions as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });
    sendSuccess(res, serializeTest(test), undefined, 201);
  } catch (e) { next(e); }
};

export const getTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id }, include: { sections: { include: { _count: { select: { questions: true } } } } } });
    if (!test) { sendError(res, 'Test not found', 404); return; }
    sendSuccess(res, serializeTest(test));
  } catch (e) { next(e); }
};

export const getTestDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const test = await prisma.test.findUnique({ where: { id: req.params.id }, include: { sections: { include: { questions: { include: { options: true } } } } } });
    if (!test) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, serializeTest(test));
  } catch (e) { next(e); }
};

export const getTestsBySeriesId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tests = await prisma.test.findMany({ where: { testSeriesId: req.params.testSeriesId }, orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, tests.map(serializeTest));
  } catch (e) { next(e); }
};

export const updateTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { instructions } = req.body as Record<string, unknown>;
    const test = await prisma.test.update({
      where: { id: req.params.id },
      data: {
        ...(normalizeTestPayload(req.body as Record<string, unknown>) as Prisma.TestUncheckedUpdateInput),
        ...(instructions && typeof instructions === 'object'
          ? { instructionsJson: instructions as Prisma.InputJsonValue }
          : {}),
      },
    });
    sendSuccess(res, serializeTest(test));
  } catch (e) { next(e); }
};

export const deleteTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.test.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

// ── Sections ──────────────────────────────────────────────

export const createSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const testId = req.params.testId || req.body.testId;
    const section = await prisma.testSection.create({ data: { ...req.body, testId } });
    sendSuccess(res, section, undefined, 201);
  } catch (e) { next(e); }
};

export const getSectionsByTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const testId = req.params.testId;
    const sections = await prisma.testSection.findMany({ where: { testId }, include: { _count: { select: { questions: true } } }, orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, sections);
  } catch (e) { next(e); }
};

export const updateSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const s = await prisma.testSection.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, s);
  } catch (e) { next(e); }
};

export const deleteSection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.testSection.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

// ── Questions ─────────────────────────────────────────────

export const createQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sectionId = req.params.sectionId || req.body.sectionId;
    const { options, ...rest } = req.body;
    const question = await prisma.question.create({
      data: { ...rest, sectionId, options: options ? { create: options } : undefined },
      include: { options: true },
    });
    sendSuccess(res, question, undefined, 201);
  } catch (e) { next(e); }
};

export const bulkCreateQuestions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sectionId = req.params.sectionId;
    const { questions } = req.body;
    const created = await Promise.all(
      questions.map((q: Record<string, unknown>) => {
        const { options, ...rest } = q as { options?: Array<{ text: string; isCorrect: boolean }>; [key: string]: unknown };
        return prisma.question.create({ data: { ...rest, sectionId, options: options ? { create: options } : undefined } as Parameters<typeof prisma.question.create>[0]['data'], include: { options: true } });
      })
    );
    sendSuccess(res, created, undefined, 201);
  } catch (e) { next(e); }
};

export const getQuestionsBySection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sectionId = req.params.sectionId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const [questions, total] = await Promise.all([
      prisma.question.findMany({ where: { sectionId }, include: { options: true }, skip: (page - 1) * limit, take: limit, orderBy: { displayOrder: 'asc' } }),
      prisma.question.count({ where: { sectionId } }),
    ]);
    sendSuccess(res, { questions, total });
  } catch (e) { next(e); }
};

export const getQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = await prisma.question.findUnique({ where: { id: req.params.id }, include: { options: true } });
    if (!q) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, q);
  } catch (e) { next(e); }
};

export const updateQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { options, ...rest } = req.body;
    const q = await prisma.question.update({ where: { id: req.params.id }, data: rest });
    sendSuccess(res, q);
  } catch (e) { next(e); }
};

export const deleteQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

// ── Student: Test Series ──────────────────────────────────

export const listPublicTestSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const subdomain = req.query.subdomain as string;
    let orgWhere = {};
    if (subdomain) {
      const org = await prisma.organization.findUnique({ where: { subdomain } });
      if (org) orgWhere = { organizationId: org.id };
    }
    const list = await prisma.testSeries.findMany({
      where: { ...orgWhere, isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        _count: { select: { tests: true, enrollments: true } },
      },
    });
    sendSuccess(res, list.map(serializeTestSeries));
  } catch (e) { next(e); }
};

export const getMyTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const enrollments = await prisma.testSeriesEnrollment.findMany({
      where: { userId: req.user!.userId },
      include: {
        testSeries: {
          include: {
            category: {
              include: {
                parent: true,
              },
            },
            tests: { where: { isPublished: true }, orderBy: { displayOrder: 'asc' } },
            _count: { select: { enrollments: true, tests: true } },
          },
        },
      },
    });
    sendSuccess(
      res,
      enrollments.map((e) => ({
        ...serializeTestSeries(e.testSeries),
        isEnrolled: true,
        isPurchased: true,
        enrollmentDetails: {
          enrolledAt: e.enrolledAt,
          startDate: e.enrolledAt,
          endDate: new Date(
            e.enrolledAt.getTime() +
              (e.testSeries.durationDays || 365) * 24 * 60 * 60 * 1000
          ).toISOString(),
          isActive: true,
        },
      }))
    );
  } catch (e) { next(e); }
};

export const getPublicTestSeries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const identifier = req.params.identifier;
    const ts = await prisma.testSeries.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }], isPublished: true },
      include: {
        category: {
          include: {
            parent: true,
          },
        },
        _count: { select: { enrollments: true, tests: true } },
      },
    });
    if (!ts) { sendError(res, 'Not found', 404); return; }
    sendSuccess(
      res,
      {
        ...serializeTestSeries(ts),
        isEnrolled: false,
        isPurchased: false,
      }
    );
  } catch (e) { next(e); }
};

export const getPublicTestsBySeriesId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tests = await prisma.test.findMany({ where: { testSeriesId: req.params.seriesId, isPublished: true }, orderBy: { displayOrder: 'asc' } });
    sendSuccess(res, tests.map(serializeTest));
  } catch (e) { next(e); }
};

export const checkoutTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { testSeriesId } = req.params;
    const ts = await prisma.testSeries.findUnique({ where: { id: testSeriesId } });
    if (!ts) { sendError(res, 'Not found', 404); return; }
    const already = await prisma.testSeriesEnrollment.findUnique({ where: { testSeriesId_userId: { testSeriesId, userId: req.user!.userId } } });
    if (already) { sendError(res, 'Already enrolled', 409); return; }
    const discounted = ts.totalPrice * (1 - ts.discountPercentage / 100);
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: ts.organizationId },
      select: {
        paymentGateway: true,
        stripeAccountId: true,
        currency: true,
        themeJson: true,
      } as any,
    }) as any;
    const amountMillimes = toMillimes(discounted);
    const order = await prisma.order.create({
      data: {
        organizationId: ts.organizationId,
        userId: req.user!.userId,
        entityType: 'TEST_SERIES',
        entityId: testSeriesId,
        amount: discounted,
        currency: PAYMENT_CURRENCY,
        paymentProvider: isStripeConnectConfigured(config) ? 'STRIPE_CONNECT' : 'KONNECT',
        receiptId: uuidv4(),
        paymentStatus: 'PENDING',
      },
    });

    try {
      if (order.paymentProvider === 'STRIPE_CONNECT') {
        if (!isStripeCurrencySupported(config.currency)) {
          throw new Error('Stripe Connect checkout supports only USD and EUR in this project');
        }

        const payment = await createStripeCheckoutSession({
          connectedAccountId: config.stripeAccountId,
          amount: discounted,
          currency: config.currency,
          orderId: order.id,
          organizationId: ts.organizationId,
          itemName: ts.title,
          customerEmail: req.user!.email || undefined,
          customerName: req.user!.email?.split('@')[0] || 'Learner',
          successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=test-series&entityId=${testSeriesId}&provider=stripe`,
          cancelUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=test-series&entityId=${testSeriesId}&provider=stripe`,
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { providerOrderId: payment.id },
        });

        sendSuccess(res, {
          orderId: order.id,
          paymentId: payment.id,
          paymentLink: payment.url,
          currency: PAYMENT_CURRENCY,
          amount: amountMillimes,
        });
        return;
      }

      const { apiKey, walletId } = getKonnectCredentials();
      const payment = await createKonnectPayment(apiKey, {
        receiverWalletId: walletId,
        amount: amountMillimes,
        token: config.currency === 'USD' || config.currency === 'EUR' ? config.currency : 'TND',
        orderId: order.id,
        firstName: req.user!.email?.split('@')[0] || 'Learner',
        email: req.user!.email || undefined,
        successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=test-series&entityId=${testSeriesId}`,
        failUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=test-series&entityId=${testSeriesId}`,
        theme: config.themeJson ? 'dark' : 'light',
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { providerOrderId: payment.paymentRef },
      });

      sendSuccess(res, {
        orderId: order.id,
        paymentId: payment.paymentRef,
        paymentLink: payment.payUrl,
        currency: PAYMENT_CURRENCY,
        amount: amountMillimes,
      });
    } catch (error) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          failureReason: error instanceof Error ? error.message : 'Failed to initialize payment',
        },
      });
      throw error;
    }
  } catch (e) { next(e); }
};

export const verifyTestSeriesPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId } = req.body;
    if (typeof orderId !== 'string' || !orderId.trim()) { sendError(res, 'Order ID is required', 400); return; }
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== req.user!.userId) { sendError(res, 'Order not found', 404); return; }
    if (!order.providerOrderId) { sendError(res, 'Payment session not found for this order', 400); return; }

    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: order.organizationId },
      select: { paymentGateway: true, stripeAccountId: true } as any,
    }) as any;
    const useStripe = order.paymentProvider === 'STRIPE_CONNECT';

    if (useStripe) {
      const payment = await retrieveStripeCheckoutSession(order.providerOrderId);
      const status = payment.payment_status || 'open';

      if (status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: status === 'open' ? 'PENDING' : 'FAILED',
            failureReason:
              status === 'open'
                ? 'Payment is still pending'
                : `Stripe payment status: ${status}`,
            providerPaymentId: payment.payment_intent || null,
          },
        });

        sendSuccess(res, {
          verified: false,
          status: status.toUpperCase(),
          message: status === 'open' ? 'Your payment is still pending. Please check again in a moment.' : 'Your payment was not completed successfully.',
        });
        return;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentProvider: 'STRIPE_CONNECT',
          paymentStatus: 'SUCCESS',
          providerPaymentId: payment.payment_intent || null,
          failureReason: null,
          completedAt: new Date(),
        },
      });

      await prisma.testSeriesEnrollment.upsert({
        where: { testSeriesId_userId: { testSeriesId: order.entityId, userId: req.user!.userId } },
        update: { isFree: false },
        create: { testSeriesId: order.entityId, userId: req.user!.userId, isFree: false },
      });

      sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Payment verified, enrolled successfully' });
      return;
    }

    const { apiKey } = getKonnectCredentials();
    const payment = await verifyKonnectPayment(apiKey, order.providerOrderId);
    const status = payment.payment.status;

    if (status !== 'completed') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: status === 'pending' ? 'PENDING' : 'FAILED',
          failureReason:
            status === 'pending'
              ? 'Payment is still pending confirmation'
              : `Konnect payment status: ${status}`,
          providerPaymentId: payment.payment.id,
        },
      });

      sendSuccess(res, {
        verified: false,
        status,
        message:
          status === 'pending'
            ? 'Your payment is still pending. Please check again in a moment.'
            : 'Your payment was not completed successfully.',
      });
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: 'KONNECT',
        paymentStatus: 'SUCCESS',
        providerPaymentId: payment.payment.id,
        failureReason: null,
        completedAt: new Date(),
      },
    });
    await prisma.testSeriesEnrollment.upsert({
      where: { testSeriesId_userId: { testSeriesId: order.entityId, userId: req.user!.userId } },
      update: { isFree: false },
      create: { testSeriesId: order.entityId, userId: req.user!.userId, isFree: false },
    });
    sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Payment verified, enrolled successfully' });
  } catch (e) { next(e); }
};

export const konnectCheckoutTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { testSeriesId } = req.params;
    const ts = await prisma.testSeries.findUnique({ where: { id: testSeriesId } });
    if (!ts) { sendError(res, 'Not found', 404); return; }
    
    const already = await prisma.testSeriesEnrollment.findUnique({ where: { testSeriesId_userId: { testSeriesId, userId: req.user!.userId } } });
    if (already) { sendError(res, 'Already enrolled', 409); return; }
    
    const discounted = ts.totalPrice * (1 - ts.discountPercentage / 100);
    const amountMillimes = toMillimes(discounted);
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: ts.organizationId },
      select: {
        paymentGateway: true,
        stripeAccountId: true,
        currency: true,
        themeJson: true,
      } as any,
    }) as any;

    const order = await prisma.order.create({
      data: {
        organizationId: ts.organizationId,
        userId: req.user!.userId,
        entityType: 'TEST_SERIES',
        entityId: testSeriesId,
        amount: discounted,
        currency: PAYMENT_CURRENCY,
        paymentProvider: isStripeConnectConfigured(config) ? 'STRIPE_CONNECT' : 'KONNECT',
        receiptId: uuidv4(),
        paymentStatus: 'PENDING',
      },
    });

    try {
      if (order.paymentProvider === 'STRIPE_CONNECT') {
        if (!isStripeCurrencySupported(config.currency)) {
          throw new Error('Stripe Connect checkout supports only USD and EUR in this project');
        }

        const payment = await createStripeCheckoutSession({
          connectedAccountId: config.stripeAccountId,
          amount: discounted,
          currency: config.currency,
          orderId: order.id,
          organizationId: ts.organizationId,
          itemName: ts.title,
          customerEmail: req.user!.email || undefined,
          customerName: req.user!.email?.split('@')[0] || 'Learner',
          successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=test-series&entityId=${testSeriesId}&provider=stripe`,
          cancelUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=test-series&entityId=${testSeriesId}&provider=stripe`,
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { providerOrderId: payment.id },
        });

        sendSuccess(res, {
          payUrl: payment.url,
          paymentRef: payment.id,
        });
        return;
      }

      const { apiKey, walletId } = getKonnectCredentials();
      const payment = await createKonnectPayment(apiKey, {
        receiverWalletId: walletId,
        amount: amountMillimes,
        token: config.currency === 'USD' || config.currency === 'EUR' ? config.currency : 'TND',
        orderId: order.id,
        firstName: req.user!.email?.split('@')[0] || 'Learner',
        email: req.user!.email || undefined,
        successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=test-series&entityId=${testSeriesId}`,
        failUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=test-series&entityId=${testSeriesId}`,
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
    } catch (error) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          failureReason:
            error instanceof Error
              ? error.message
              : 'Failed to initialize payment',
        },
      });
      throw error;
    }
  } catch (e) { next(e); }
};

export const konnectVerifyTestSeriesPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentRef } = req.body;
    if (typeof paymentRef !== 'string' || !paymentRef.trim()) { sendError(res, 'Payment Ref is required', 400); return; }
    
    const order = await prisma.order.findFirst({ where: { providerOrderId: paymentRef } });
    if (!order || order.userId !== req.user!.userId) { sendError(res, 'Order not found', 404); return; }

    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: order.organizationId },
      select: { paymentGateway: true, stripeAccountId: true } as any,
    }) as any;
    const useStripe = order.paymentProvider === 'STRIPE_CONNECT';

    if (useStripe) {
      const payment = await retrieveStripeCheckoutSession(paymentRef);
      const status = payment.payment_status || 'open';

      if (status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: status === 'open' ? 'PENDING' : 'FAILED',
            failureReason:
              status === 'open' ? 'Payment is still pending' : `Stripe payment status: ${status}`,
            providerPaymentId: payment.payment_intent || null,
          },
        });

        sendSuccess(res, {
          verified: false,
          status: status.toUpperCase(),
          message: status === 'open' ? 'Your payment is still pending. Please check again in a moment.' : 'Your payment was not completed successfully.',
        });
        return;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentProvider: 'STRIPE_CONNECT',
          paymentStatus: 'SUCCESS',
          providerPaymentId: payment.payment_intent || null,
          failureReason: null,
          completedAt: new Date(),
        },
      });

      await prisma.testSeriesEnrollment.upsert({
        where: { testSeriesId_userId: { testSeriesId: order.entityId, userId: req.user!.userId } },
        update: { isFree: false },
        create: { testSeriesId: order.entityId, userId: req.user!.userId, isFree: false },
      });

      sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Payment verified, enrolled successfully' });
      return;
    }

    const { apiKey } = getKonnectCredentials();
    const paymentDetails = await verifyKonnectPayment(apiKey, paymentRef);
    const status = paymentDetails.payment.status;
    const providerPaymentId = paymentDetails.payment.id;

    if (status !== 'completed') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: status === 'pending' ? 'PENDING' : 'FAILED',
          failureReason: status === 'pending' ? 'Payment is still pending' : `Konnect status: ${status}`,
          providerPaymentId,
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
        paymentProvider: 'KONNECT',
        paymentStatus: 'SUCCESS',
        providerPaymentId,
        failureReason: null,
        completedAt: new Date(),
      },
    });

    await prisma.testSeriesEnrollment.upsert({
      where: { testSeriesId_userId: { testSeriesId: order.entityId, userId: req.user!.userId } },
      update: { isFree: false },
      create: { testSeriesId: order.entityId, userId: req.user!.userId, isFree: false },
    });

    sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Payment verified, enrolled successfully' });
  } catch (e) { next(e); }
};

export const enrollFreeTestSeries = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { testSeriesId } = req.params;
    const ts = await prisma.testSeries.findUnique({ where: { id: testSeriesId } });
    if (!ts || !ts.isFree) { sendError(res, 'Not a free test series', 400); return; }
    await prisma.testSeriesEnrollment.create({ data: { testSeriesId, userId: req.user!.userId, isFree: true } });
    sendSuccess(res, { message: 'Enrolled successfully' });
  } catch (e) { next(e); }
};

export const getPublishedTestDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const identifier = req.params.identifier;
    const test = await prisma.test.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }], isPublished: true },
      include: { sections: { include: { _count: { select: { questions: true } } } } },
    });
    if (!test) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, serializeTest(test));
  } catch (e) { next(e); }
};

export const getTestPreview = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const test = await prisma.test.findUnique({
      where: { id: req.params.testId },
      include: {
        sections: {
          include: {
            questions: { include: { options: { select: { id: true, text: true } } }, orderBy: { displayOrder: 'asc' } },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!test) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, serializeTest(test));
  } catch (e) { next(e); }
};
