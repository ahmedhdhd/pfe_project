import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { createKonnectPayment, getKonnectCredentials, verifyKonnectPayment } from '../utils/konnect';
import {
  createStripeCheckoutSession,
  normalizePaymentGateway,
  retrieveStripeCheckoutSession,
} from '../utils/stripeConnect';

const PAYMENT_CURRENCY = 'TND';
const toMillimes = (amount: number) => Math.round(amount * 1000);
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const isStripeConfigured = (config: { paymentGateway?: unknown }) =>
  normalizePaymentGateway(config?.paymentGateway) === 'STRIPE';

/**
 * Check if a subscription order is still active based on subscription type.
 * - onetime: always active if payment succeeded
 * - monthly: active only if completedAt is within the last 30 days
 */
function isSubscriptionActive(order: { completedAt: Date | null } | null, subscriptionType: string): boolean {
  if (!order || !order.completedAt) return false;
  if (subscriptionType !== 'monthly') return true; // onetime = forever
  const expiresAt = new Date(order.completedAt.getTime() + THIRTY_DAYS_MS);
  return new Date() < expiresAt;
}

/**
 * GET /api/subscription/status
 * Check if the current user has an active subscription.
 */
export const getSubscriptionStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.user!.organizationId;

    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
      select: {
        paymentMode: true,
        subscriptionPrice: true,
        subscriptionType: true,
        currency: true,
        themeJson: true,
        paymentGateway: true,
        stripeAccountId: true,
      } as any,
    }) as any;

    if (config?.paymentMode !== 'subscription') {
      sendSuccess(res, { isSubscribed: false, paymentMode: config?.paymentMode || 'per_course' });
      return;
    }

    const subscriptionType = config.subscriptionType || 'onetime';

    const successfulOrder = await prisma.order.findFirst({
      where: {
        userId,
        organizationId: orgId,
        entityType: 'BATCH',
        paymentProvider: { in: ['KONNECT', 'FLOUCI', 'STRIPE_CONNECT'] },
        paymentStatus: 'SUCCESS',
        receiptId: { startsWith: 'sub_' },
      },
      orderBy: { completedAt: 'desc' },
    });

    const isActive = isSubscriptionActive(successfulOrder, subscriptionType);
    const expiresAt = subscriptionType === 'monthly' && successfulOrder?.completedAt
      ? new Date(successfulOrder.completedAt.getTime() + THIRTY_DAYS_MS).toISOString()
      : null;

    sendSuccess(res, {
      isSubscribed: isActive,
      paymentMode: 'subscription',
      subscriptionType,
      subscribedAt: successfulOrder?.completedAt || null,
      expiresAt,
    });
  } catch (e) { next(e); }
};

/**
 * POST /api/subscription/checkout
 * Initialize a Konnect payment for the subscription price.
 */
export const subscriptionCheckout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const orgId = req.user!.organizationId;

    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
    }) as any;

    if (!config || config.paymentMode !== 'subscription') {
      sendError(res, 'Subscription mode is not enabled for this organization', 400);
      return;
    }

    const subscriptionPrice = config.subscriptionPrice || 0;
    if (subscriptionPrice <= 0) {
      sendError(res, 'Subscription price is not configured', 400);
      return;
    }

    const subscriptionType = config.subscriptionType || 'onetime';

    // Check if user already has an active subscription
    const existingSub = await prisma.order.findFirst({
      where: {
        userId,
        organizationId: orgId,
        paymentProvider: { in: ['KONNECT', 'FLOUCI', 'STRIPE_CONNECT'] },
        paymentStatus: 'SUCCESS',
        receiptId: { startsWith: 'sub_' },
      },
      orderBy: { completedAt: 'desc' },
    });

    if (existingSub && isSubscriptionActive(existingSub, subscriptionType)) {
      sendError(res, 'You already have an active subscription', 409);
      return;
    }

    const amountMillimes = toMillimes(subscriptionPrice);
    const order = await prisma.order.create({
      data: {
        organizationId: orgId,
        userId,
        entityType: 'BATCH',
        entityId: orgId,
        amount: subscriptionPrice,
        currency: PAYMENT_CURRENCY,
        paymentProvider: isStripeConfigured(config) ? 'STRIPE' : 'KONNECT',
        receiptId: `sub_${uuidv4()}`,
        paymentStatus: 'PENDING',
      },
    });

    try {
      const userObj = await prisma.user.findUnique({ where: { id: userId } });
      if (order.paymentProvider === 'STRIPE') {
        const payment = await createStripeCheckoutSession({
          amount: subscriptionPrice,
          currency: config.currency,
          orderId: order.id,
          organizationId: orgId,
          itemName: `Subscription - ${config.name || 'Organization'}`,
          customerEmail: userObj?.email || undefined,
          customerName: userObj?.email?.split('@')[0] || 'Learner',
          successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=subscription&provider=stripe`,
          cancelUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={CHECKOUT_SESSION_ID}&type=subscription&provider=stripe`,
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
        firstName: userObj?.email?.split('@')[0] || 'Learner',
        email: userObj?.email || undefined,
        successUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=subscription`,
        failUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=subscription`,
        theme: 'light',
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

/**
 * POST /api/subscription/verify
 * Verify a Konnect subscription payment.
 */
export const subscriptionVerify = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const paymentRef = typeof req.body?.paymentRef === 'string' ? req.body.paymentRef.trim() : '';
    const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
    if (!paymentRef && !orderId) {
      sendError(res, 'Payment Ref or Order ID is required', 400);
      return;
    }

    const order = await prisma.order.findFirst({
      where: orderId ? { id: orderId } : { providerOrderId: paymentRef },
    });
    if (!order || order.userId !== req.user!.userId) {
      sendError(res, 'Order not found', 404);
      return;
    }

    if (order.paymentStatus === 'SUCCESS') {
      sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Subscription already active' });
      return;
    }

    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: order.organizationId },
      select: { paymentGateway: true, stripeAccountId: true } as any,
    }) as any;

    let status = '';
    let providerPaymentId: string | null = null;

    const useStripe = order.paymentProvider === 'STRIPE_CONNECT';
    if (useStripe) {
      const paymentDetails = await retrieveStripeCheckoutSession(paymentRef || order.providerOrderId || order.id);
      status = paymentDetails.payment_status || 'open';
      providerPaymentId = paymentDetails.payment_intent || null;

      if (status !== 'paid') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: status === 'open' ? 'PENDING' : 'FAILED',
            failureReason: status === 'open' ? 'Payment is still pending' : `Stripe payment status: ${status}`,
            providerPaymentId,
          },
        });

        sendSuccess(res, {
          verified: false,
          status: status.toUpperCase(),
          message: status === 'open'
            ? 'Your payment is still pending. Please check again in a moment.'
            : 'Your payment was not completed successfully.',
        });
        return;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentProvider: 'STRIPE_CONNECT',
          paymentStatus: 'SUCCESS',
          providerPaymentId,
          failureReason: null,
          completedAt: new Date(),
        },
      });

      sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Subscription activated successfully' });
      return;
    }

    const { apiKey } = getKonnectCredentials();
    const paymentDetails = await verifyKonnectPayment(apiKey, paymentRef);
    status = paymentDetails.payment.status;
    providerPaymentId = paymentDetails.payment.id;

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
        message: status === 'pending'
          ? 'Your payment is still pending. Please check again in a moment.'
          : 'Your payment was not completed successfully.',
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

    sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Subscription activated successfully' });
  } catch (e) { next(e); }
};
