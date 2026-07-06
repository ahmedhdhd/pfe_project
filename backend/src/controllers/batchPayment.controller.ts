import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { createKonnectPayment, getKonnectCredentials, verifyKonnectPayment } from '../utils/konnect';
import { getOrderBatchIds, grantOrderEntitlements } from './order.controller';
import {
  createStripeCheckoutSession,
  retrieveStripeCheckoutSession,
} from '../utils/stripeConnect';
import { buildTenantFrontendUrl } from '../utils/frontend-url';
import {
  PAYMENT_CURRENCY,
  getOrganizationPaymentMode,
  hasActiveSubscription,
  isStripeConfigured,
  toMillimes,
} from './batch.helpers';

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
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: batch.organizationId },
      select: {
        paymentMode: true,
        currency: true,
        themeJson: true,
        paymentGateway: true,
        stripeAccountId: true,
        stripeChargesEnabled: true,
      } as any,
    }) as any;
    const organization = await prisma.organization.findUnique({
      where: { id: batch.organizationId },
      select: { subdomain: true },
    });
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
        paymentProvider: isStripeConfigured(config) ? 'STRIPE' : 'KONNECT',
        receiptId: uuidv4(),
        paymentStatus: 'PENDING',
      },
    });

    try {
      if (order.paymentProvider === 'STRIPE') {
        const returnPath = `/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=batch&entityId=${batchId}&provider=stripe`;
        const returnUrl = buildTenantFrontendUrl(
          process.env.FRONTEND_URL,
          organization?.subdomain,
          returnPath
        );
        const payment = await createStripeCheckoutSession({
          amount: discounted,
          currency: config.currency,
          orderId: order.id,
          organizationId: batch.organizationId,
          itemName: batch.name,
          customerEmail: req.user!.email || undefined,
          customerName: req.user!.email?.split('@')[0] || 'Learner',
          successUrl: returnUrl,
          cancelUrl: returnUrl,
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
        successUrl: buildTenantFrontendUrl(
          process.env.FRONTEND_URL,
          organization?.subdomain,
          `/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`
        ),
        failUrl: buildTenantFrontendUrl(
          process.env.FRONTEND_URL,
          organization?.subdomain,
          `/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`
        ),
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
  } catch (e) { next(e); }
};

export const verifyBatchPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    const useStripe =
      order.paymentProvider === 'STRIPE_CONNECT' ||
      order.paymentProvider === 'STRIPE' ||
      order.providerOrderId.startsWith('cs_');

    if (useStripe) {
      const payment = await retrieveStripeCheckoutSession(order.providerOrderId);
      const status = payment.payment_status || 'open';

      if (status !== 'paid') {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: status === 'open' ? 'PENDING' : 'FAILED',
            failureReason:
              status === 'open'
                ? 'Payment is still pending confirmation'
                : `Stripe payment status: ${status}`,
            providerPaymentId: payment.payment_intent || null,
            completedAt: status === 'open' ? null : order.completedAt,
          },
        });

        sendSuccess(res, {
          verified: false,
          status,
          message:
            status === 'open'
              ? 'Your payment is still pending. Please check again in a moment.'
              : 'Your payment was not completed successfully.',
        });
        return;
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'SUCCESS',
          providerPaymentId: payment.payment_intent || null,
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
          completedAt: status === 'pending' ? null : order.completedAt,
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
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: batch.organizationId },
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

    const order = await prisma.order.create({
      data: {
        organizationId: batch.organizationId,
        userId: req.user!.userId,
        entityType: 'BATCH',
        entityId: batchId,
        amount: discounted,
        currency: PAYMENT_CURRENCY,
        paymentProvider: isStripeConfigured(config) ? 'STRIPE' : 'KONNECT',
        receiptId: uuidv4(),
        paymentStatus: 'PENDING',
      },
    });

    try {
      const organization = await prisma.organization.findUnique({
        where: { id: batch.organizationId },
        select: { subdomain: true },
      });
      if (order.paymentProvider === 'STRIPE') {
        const returnPath = `/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=batch&entityId=${batchId}&provider=stripe`;
        const returnUrl = buildTenantFrontendUrl(
          process.env.FRONTEND_URL,
          organization?.subdomain,
          returnPath
        );
        const payment = await createStripeCheckoutSession({
          amount: discounted,
          currency: config.currency,
          orderId: order.id,
          organizationId: batch.organizationId,
          itemName: batch.name,
          customerEmail: req.user!.email || undefined,
          customerName: req.user!.email?.split('@')[0] || 'Learner',
          successUrl: returnUrl,
          cancelUrl: returnUrl,
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
        successUrl: buildTenantFrontendUrl(
          process.env.FRONTEND_URL,
          organization?.subdomain,
          `/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`
        ),
        failUrl: buildTenantFrontendUrl(
          process.env.FRONTEND_URL,
          organization?.subdomain,
          `/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=${batchId}`
        ),
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
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to initialize payment';
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
  } catch (e) { next(e); }
};

export const konnectVerifyBatchPayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { paymentRef } = req.body;
    if (typeof paymentRef !== 'string' || !paymentRef.trim()) { sendError(res, 'Payment Ref is required', 400); return; }

    const order = await prisma.order.findFirst({ where: { providerOrderId: paymentRef } });
    if (!order || order.userId !== req.user!.userId) { sendError(res, 'Order not found', 404); return; }

    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: order.organizationId },
      select: { paymentGateway: true, stripeAccountId: true } as any,
    }) as any;
    const useStripe =
      order.paymentProvider === 'STRIPE_CONNECT' ||
      order.paymentProvider === 'STRIPE' ||
      paymentRef.startsWith('cs_');

    if (useStripe) {
      const payment = await retrieveStripeCheckoutSession(paymentRef);
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
          paymentStatus: 'SUCCESS',
          providerPaymentId: payment.payment_intent || null,
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
