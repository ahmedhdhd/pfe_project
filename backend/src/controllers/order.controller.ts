import { NextFunction, Response } from 'express';
import { EntityType, ManualOrderStatus, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendError, sendSuccess } from '../utils/response';
import { createKonnectPayment, getKonnectCredentials } from '../utils/konnect';
import {
  createStripeCheckoutSession,
  getStripeConnectCheckoutBlockReason,
  normalizePaymentGateway,
  retrieveStripeCheckoutSession,
} from '../utils/stripeConnect';

const PAYMENT_CURRENCY_FALLBACK = 'TND';
const MANUAL_PAYMENT_PROVIDERS = ['BANK_TRANSFER', 'MANDAT_MINUTE_POSTE'] as const;
const toMillimes = (amount: number) => Math.max(0, Math.round(amount * 1000));

type OrderDbClient = typeof prisma | Prisma.TransactionClient;

type OrderItemSnapshot = {
  batchId: string;
  title: string;
  imageUrl?: string | null;
  originalPrice: number;
  finalPrice: number;
  discountPercentage: number;
  category?: string | null;
  language?: string | null;
};

type BillingPayload = {
  firstName?: unknown;
  lastName?: unknown;
  enterprise?: unknown;
  taxNumber?: unknown;
  region?: unknown;
  phone?: unknown;
  email?: unknown;
};

type CourseOrderInput = {
  batchIds?: unknown;
  paymentMethod?: unknown;
  billing?: BillingPayload;
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeManualProvider = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === 'GATEWAY') return 'GATEWAY' as const;
  if (normalized === 'BANK_TRANSFER') return 'BANK_TRANSFER' as const;
  if (normalized === 'MANDAT_MINUTE_POSTE') return 'MANDAT_MINUTE_POSTE' as const;
  return null;
};

const parseOrderItems = (value: unknown): OrderItemSnapshot[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const batchId = normalizeOptionalString(record.batchId ?? record.id);
      const title = normalizeOptionalString(record.title ?? record.name);
      if (!batchId || !title) return null;
      return {
        batchId,
        title,
        imageUrl: normalizeOptionalString(record.imageUrl) ?? null,
        originalPrice: Number(record.originalPrice ?? record.totalPrice ?? 0) || 0,
        finalPrice: Number(record.finalPrice ?? record.amount ?? 0) || 0,
        discountPercentage: Number(record.discountPercentage ?? 0) || 0,
        category: normalizeOptionalString(record.category) ?? null,
        language: normalizeOptionalString(record.language) ?? null,
      } satisfies OrderItemSnapshot;
    })
    .filter(Boolean) as OrderItemSnapshot[];
};

export const getOrderBatchIds = (order: {
  entityType: EntityType;
  entityId: string;
  itemsJson?: unknown;
}) => {
  const items = parseOrderItems(order.itemsJson);
  if (items.length > 0) {
    return Array.from(new Set(items.map((item) => item.batchId)));
  }

  if (order.entityType === 'BATCH' || order.entityType === 'BATCH_CART') {
    return order.entityId ? [order.entityId] : [];
  }

  return [];
};

export const grantOrderEntitlements = async (
  db: OrderDbClient,
  order: {
    entityType: EntityType;
    entityId: string;
    userId: string;
    itemsJson?: unknown;
  }
) => {
  if (order.entityType === 'TEST_SERIES') {
    await db.testSeriesEnrollment.upsert({
      where: {
        testSeriesId_userId: {
          testSeriesId: order.entityId,
          userId: order.userId,
        },
      },
      update: { isFree: false },
      create: {
        testSeriesId: order.entityId,
        userId: order.userId,
        isFree: false,
      },
    });
    return;
  }

  const batchIds = getOrderBatchIds(order);
  for (const batchId of batchIds) {
    await db.batchEnrollment.upsert({
      where: {
        batchId_userId: {
          batchId,
          userId: order.userId,
        },
      },
      update: { isFree: false },
      create: {
        batchId,
        userId: order.userId,
        isFree: false,
      },
    });
  }
};

const getOrderEntityMaps = async (
  orders: Array<{ entityType: EntityType; entityId: string }>
) => {
  const batchIds = Array.from(
    new Set(
      orders
        .filter((order) => order.entityType === 'BATCH')
        .map((order) => order.entityId)
        .filter(Boolean)
    )
  );
  const testSeriesIds = Array.from(
    new Set(
      orders
        .filter((order) => order.entityType === 'TEST_SERIES')
        .map((order) => order.entityId)
        .filter(Boolean)
    )
  );

  const [batches, testSeries] = await Promise.all([
    batchIds.length
      ? prisma.batch.findMany({
          where: { id: { in: batchIds } },
          select: { id: true, name: true, imageUrl: true },
        })
      : Promise.resolve([]),
    testSeriesIds.length
      ? prisma.testSeries.findMany({
          where: { id: { in: testSeriesIds } },
          select: { id: true, title: true, thumbnailUrl: true },
        })
      : Promise.resolve([]),
  ]);

  return {
    batches: new Map(batches.map((batch) => [batch.id, batch])),
    testSeries: new Map(testSeries.map((series) => [series.id, series])),
  };
};

const serializeOrder = (
  order: Record<string, any>,
  entityMaps?: Awaited<ReturnType<typeof getOrderEntityMaps>>
) => {
  const items = parseOrderItems(order.itemsJson);
  const firstItem = items[0];
  const batchDetails =
    order.entityType === 'BATCH'
      ? entityMaps?.batches.get(order.entityId)
      : undefined;
  const testSeriesDetails =
    order.entityType === 'TEST_SERIES'
      ? entityMaps?.testSeries.get(order.entityId)
      : undefined;

  const entityDetails =
    order.entityType === 'BATCH_CART'
      ? {
          name:
            items.length === 1
              ? firstItem?.title || 'Course order'
              : `${items.length} courses`,
          imageUrl: firstItem?.imageUrl || null,
        }
      : order.entityType === 'BATCH'
      ? {
          name: batchDetails?.name || firstItem?.title || 'Course',
          imageUrl: batchDetails?.imageUrl || firstItem?.imageUrl || null,
        }
      : {
          title: testSeriesDetails?.title || 'Test Series',
          imageUrl: testSeriesDetails?.thumbnailUrl || null,
        };

  return {
    id: order.id,
    entityType: order.entityType,
    entityId: order.entityId,
    amount: order.amount,
    currency: order.currency,
    paymentProvider: order.paymentProvider,
    paymentStatus: order.paymentStatus,
    providerOrderId: order.providerOrderId,
    providerPaymentId: order.providerPaymentId,
    receiptId: order.receiptId,
    failureReason: order.failureReason,
    refundId: order.refundId,
    refundAmount: order.refundAmount,
    refundedAt: order.refundedAt?.toISOString?.() || order.refundedAt || null,
    initiatedAt: order.initiatedAt?.toISOString?.() || order.initiatedAt,
    completedAt: order.completedAt?.toISOString?.() || order.completedAt || null,
    failedAt: order.failedAt?.toISOString?.() || order.failedAt || null,
    createdAt: order.createdAt?.toISOString?.() || order.createdAt,
    updatedAt: order.updatedAt?.toISOString?.() || order.updatedAt,
    entityDetails,
    items,
    itemCount: items.length || (order.entityType === 'TEST_SERIES' ? 1 : 0),
    billingInfo: {
      firstName: order.billingFirstName || '',
      lastName: order.billingLastName || '',
      enterprise: order.billingEnterprise || '',
      taxNumber: order.billingTaxNumber || '',
      region: order.billingRegion || '',
      phone: order.billingPhone || '',
      email: order.billingEmail || '',
    },
    manualReviewStatus: order.manualReviewStatus,
    proofImageUrl: order.proofImageUrl || null,
    proofUploadedAt:
      order.proofUploadedAt?.toISOString?.() || order.proofUploadedAt || null,
    adminReviewNote: order.adminReviewNote || null,
    reviewedByUserId: order.reviewedByUserId || null,
    reviewedAt: order.reviewedAt?.toISOString?.() || order.reviewedAt || null,
    user: order.user
      ? {
          id: order.user.id,
          username: order.user.username,
          email: order.user.email,
        }
      : undefined,
  };
};

export const createCourseOrderCheckout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const organizationId = req.user!.organizationId;
    const input = (req.body || {}) as CourseOrderInput;
    const paymentMethod = normalizeManualProvider(input.paymentMethod);
    const batchIds = Array.isArray(input.batchIds)
      ? input.batchIds
          .map((value) => normalizeOptionalString(value))
          .filter((value): value is string => !!value)
      : [];

    if (!paymentMethod) {
      sendError(res, 'A valid payment method is required', 400);
      return;
    }

    if (!batchIds.length) {
      sendError(res, 'Select at least one course to continue', 400);
      return;
    }

    const billing = input.billing || {};
    const firstName = normalizeOptionalString(billing.firstName);
    const lastName = normalizeOptionalString(billing.lastName);
    const region = normalizeOptionalString(billing.region);
    const phone = normalizeOptionalString(billing.phone);
    const email =
      normalizeOptionalString(billing.email) || normalizeOptionalString(req.user?.email);

    if (!firstName || !lastName || !region || !phone || !email) {
      sendError(res, 'Please complete the required billing information', 400);
      return;
    }

    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId },
      select: {
        paymentMode: true,
        currency: true,
        themeJson: true,
        paymentGateway: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
      } as any,
    }) as any;

    if ((config?.paymentMode || 'per_course') !== 'per_course') {
      sendError(res, 'Per-course checkout is not enabled for this organization', 400);
      return;
    }

    const uniqueBatchIds = Array.from(new Set(batchIds));
    const batches = await prisma.batch.findMany({
      where: {
        id: { in: uniqueBatchIds },
        organizationId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        totalPrice: true,
        discountPercentage: true,
        language: true,
        category: { select: { name: true } },
      },
    });

    if (batches.length !== uniqueBatchIds.length) {
      sendError(res, 'One or more selected courses are unavailable for checkout', 400);
      return;
    }

    const enrollments = await prisma.batchEnrollment.findMany({
      where: {
        userId,
        batchId: { in: uniqueBatchIds },
      },
      select: { batchId: true },
    });
    const enrolledSet = new Set(enrollments.map((item) => item.batchId));
    const purchasableBatches = batches.filter((batch) => !enrolledSet.has(batch.id));

    if (!purchasableBatches.length) {
      sendError(res, 'You are already enrolled in the selected courses', 409);
      return;
    }

    const items: OrderItemSnapshot[] = purchasableBatches.map((batch) => {
      const finalPrice = Number(
        (batch.totalPrice * (1 - (batch.discountPercentage || 0) / 100)).toFixed(2)
      );
      return {
        batchId: batch.id,
        title: batch.name,
        imageUrl: batch.imageUrl || null,
        originalPrice: batch.totalPrice,
        finalPrice,
        discountPercentage: batch.discountPercentage || 0,
        category: batch.category?.name || null,
        language: batch.language || null,
      };
    });

    const amount = Number(
      items.reduce((sum, item) => sum + item.finalPrice, 0).toFixed(2)
    );
    const currency = normalizeOptionalString(config?.currency)?.toUpperCase() || PAYMENT_CURRENCY_FALLBACK;
    const entityType = items.length > 1 ? EntityType.BATCH_CART : EntityType.BATCH;
    const entityId = items[0].batchId;

    const baseOrderData = {
      organizationId,
      userId,
      entityType,
      entityId,
      amount,
      currency,
      receiptId: uuidv4(),
      billingFirstName: firstName,
      billingLastName: lastName,
      billingEnterprise: normalizeOptionalString(billing.enterprise),
      billingTaxNumber: normalizeOptionalString(billing.taxNumber),
      billingRegion: region,
      billingPhone: phone,
      billingEmail: email,
      itemsJson: items,
    };

    if (paymentMethod !== 'GATEWAY') {
      const paymentProvider =
        paymentMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'MANDAT_MINUTE_POSTE';

      const order = await prisma.order.create({
        data: {
          ...baseOrderData,
          paymentProvider,
          paymentStatus: 'PENDING',
          manualReviewStatus: ManualOrderStatus.AWAITING_PROOF,
        },
      });

      sendSuccess(
        res,
        {
          orderId: order.id,
          redirectUrl: '/student/orders',
          order: serializeOrder(order),
        },
        'Order created. Please upload your payment proof to continue.',
        201
      );
      return;
    }

    const order = await prisma.order.create({
      data: {
        ...baseOrderData,
        paymentProvider:
          config?.stripeAccountId && normalizePaymentGateway(config?.paymentGateway) === 'STRIPE_CONNECT'
            ? 'STRIPE_CONNECT'
            : 'KONNECT',
        paymentStatus: 'PENDING',
        manualReviewStatus: ManualOrderStatus.NOT_REQUIRED,
      },
    });

    try {
      if (order.paymentProvider === 'STRIPE_CONNECT') {
        const stripeBlockReason = getStripeConnectCheckoutBlockReason({
          stripeAccountId: config?.stripeAccountId,
          stripeChargesEnabled: config?.stripeChargesEnabled,
          currency,
        });
        if (stripeBlockReason) {
          throw new Error(stripeBlockReason);
        }

        const payment = await createStripeCheckoutSession({
          connectedAccountId: config.stripeAccountId,
          amount,
          currency,
          orderId: order.id,
          organizationId,
          itemName:
            items.length === 1 ? items[0].title : `${items.length} courses checkout`,
          customerEmail: email,
          customerName: `${firstName} ${lastName}`.trim(),
          successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=batch&entityId=${entityId}&provider=stripe`,
          cancelUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=batch&entityId=${entityId}&provider=stripe`,
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { providerOrderId: payment.id },
        });

        sendSuccess(res, {
          orderId: order.id,
          payUrl: payment.url,
          paymentLink: payment.url,
          paymentRef: payment.id,
          purchasedBatchIds: items.map((item) => item.batchId),
        });
        return;
      }

      const { apiKey, walletId } = getKonnectCredentials();
      const payment = await createKonnectPayment(apiKey, {
        receiverWalletId: walletId,
        amount: toMillimes(amount),
        token:
          currency === 'USD' || currency === 'EUR' ? (currency as 'USD' | 'EUR') : 'TND',
        firstName,
        lastName,
        phoneNumber: phone,
        email,
        orderId: order.id,
        successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${entityId}`,
        failUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${entityId}`,
        theme: config?.themeJson ? 'dark' : 'light',
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { providerOrderId: payment.paymentRef },
      });

      sendSuccess(res, {
        orderId: order.id,
        payUrl: payment.payUrl,
        paymentLink: payment.payUrl,
        paymentRef: payment.paymentRef,
        purchasedBatchIds: items.map((item) => item.batchId),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize payment';
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          failureReason: message,
        },
      });
      sendError(res, message, 400);
      return;
    }
  } catch (error) {
    next(error);
  }
};

export const listStudentOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const where = {
      userId,
      ...(req.query.status
        ? { paymentStatus: String(req.query.status).toUpperCase() as any }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const entityMaps = await getOrderEntityMaps(orders);
    res.status(200).json({
      success: true,
      data: orders.map((order) => serializeOrder(order, entityMaps)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getStudentOrderById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order || order.userId !== req.user!.userId) {
      sendError(res, 'Order not found', 404);
      return;
    }

    const entityMaps = await getOrderEntityMaps([order]);
    sendSuccess(res, serializeOrder(order, entityMaps));
  } catch (error) {
    next(error);
  }
};

export const uploadStudentOrderProof = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const proofImageUrl = normalizeOptionalString(req.body?.proofImageUrl);
    if (!proofImageUrl) {
      sendError(res, 'A proof image is required', 400);
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order || order.userId !== req.user!.userId) {
      sendError(res, 'Order not found', 404);
      return;
    }

    if (!MANUAL_PAYMENT_PROVIDERS.includes(order.paymentProvider as (typeof MANUAL_PAYMENT_PROVIDERS)[number])) {
      sendError(res, 'Proof upload is only available for manual payment orders', 400);
      return;
    }

    if (order.paymentStatus === 'SUCCESS') {
      sendError(res, 'This order is already validated', 400);
      return;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        proofImageUrl,
        proofUploadedAt: new Date(),
        manualReviewStatus: ManualOrderStatus.UNDER_REVIEW,
      },
    });

    const entityMaps = await getOrderEntityMaps([updated]);
    sendSuccess(
      res,
      serializeOrder(updated, entityMaps),
      'Payment proof uploaded successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const listAdminOrders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const where = {
      organizationId: req.user!.organizationId,
      ...(req.query.status
        ? { paymentStatus: String(req.query.status).toUpperCase() as any }
        : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    const entityMaps = await getOrderEntityMaps(orders);
    res.status(200).json({
      success: true,
      data: orders.map((order) => serializeOrder(order, entityMaps)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrderById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!order || order.organizationId !== req.user!.organizationId) {
      sendError(res, 'Order not found', 404);
      return;
    }

    const entityMaps = await getOrderEntityMaps([order]);
    sendSuccess(res, serializeOrder(order, entityMaps));
  } catch (error) {
    next(error);
  }
};

export const approveAdminOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note = normalizeOptionalString(req.body?.note);
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!existing || existing.organizationId !== req.user!.organizationId) {
      sendError(res, 'Order not found', 404);
      return;
    }

    if (!MANUAL_PAYMENT_PROVIDERS.includes(existing.paymentProvider as (typeof MANUAL_PAYMENT_PROVIDERS)[number])) {
      sendError(res, 'Only manual payment orders can be validated here', 400);
      return;
    }

    if (!existing.proofImageUrl) {
      sendError(res, 'The student has not uploaded a payment proof yet', 400);
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: existing.id },
        data: {
          paymentStatus: 'SUCCESS',
          manualReviewStatus: ManualOrderStatus.APPROVED,
          adminReviewNote: note || null,
          reviewedByUserId: req.user!.userId,
          reviewedAt: new Date(),
          completedAt: new Date(),
          failureReason: null,
        },
      });

      await grantOrderEntitlements(tx, order);
      return order;
    });

    const entityMaps = await getOrderEntityMaps([updated]);
    sendSuccess(res, serializeOrder(updated, entityMaps), 'Order validated successfully');
  } catch (error) {
    next(error);
  }
};

export const rejectAdminOrder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const note =
      normalizeOptionalString(req.body?.note) || 'Manual payment proof was rejected';
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
    });

    if (!existing || existing.organizationId !== req.user!.organizationId) {
      sendError(res, 'Order not found', 404);
      return;
    }

    const updated = await prisma.order.update({
      where: { id: existing.id },
      data: {
        paymentStatus: 'FAILED',
        manualReviewStatus: ManualOrderStatus.REJECTED,
        adminReviewNote: note,
        reviewedByUserId: req.user!.userId,
        reviewedAt: new Date(),
        failedAt: new Date(),
        failureReason: note,
      },
    });

    const entityMaps = await getOrderEntityMaps([updated]);
    sendSuccess(res, serializeOrder(updated, entityMaps), 'Order rejected');
  } catch (error) {
    next(error);
  }
};
