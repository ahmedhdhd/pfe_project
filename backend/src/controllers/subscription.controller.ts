import { Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  buildFlouciCallbackUrl,
  createFlouciPayment,
  resolveFlouciCredentials,
  verifyFlouciPayment,
} from '../utils/flouci';
import { createKonnectPayment, verifyKonnectPayment } from '../utils/konnect';
import { createPaymeePayment, verifyPaymeePayment } from '../utils/paymee';

const PAYMENT_CURRENCY = 'TND';
const toMillimes = (amount: number) => Math.round(amount * 1000);
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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
        paymentProvider: { in: ['KONNECT', 'PAYMEE'] },
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

    const gateway = (config.paymentGateway || 'konnect').toLowerCase();
    if (gateway === 'flouci' && (!config.razorpayKeyId || !config.razorpayKeySecret)) {
      sendError(res, 'Flouci payment is not configured', 400);
      return;
    }
    if (gateway === 'konnect' && (!config.konnectApiKey || !config.konnectWalletId)) {
      sendError(res, 'Konnect payment is not configured', 400);
      return;
    }
    if (gateway === 'paymee' && !config.paymeeApiToken) {
      sendError(res, 'Paymee payment is not configured', 400);
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
        paymentProvider: { in: ['KONNECT', 'PAYMEE', 'FLOUCI'] },
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
        paymentProvider: gateway === 'flouci' ? 'FLOUCI' : gateway === 'paymee' ? 'PAYMEE' : 'KONNECT',
        receiptId: `sub_${uuidv4()}`,
        paymentStatus: 'PENDING',
      },
    });

    try {
      const userObj = await prisma.user.findUnique({ where: { id: userId } });
      if (gateway === 'flouci') {
        const { publicKey, privateKey } = resolveFlouciCredentials(config);
        const payment = await createFlouciPayment({
          amountMillimes,
          publicKey,
          privateKey,
          trackingId: order.id,
          clientId: userId,
          imageUrl: config?.logoUrl || undefined,
          successLink: buildFlouciCallbackUrl({
            orderId: order.id,
            type: 'subscription',
            entityId: orgId,
            status: 'success',
          }),
          failLink: buildFlouciCallbackUrl({
            orderId: order.id,
            type: 'subscription',
            entityId: orgId,
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
          amount: subscriptionPrice,
          note: `Subscription payment - ${order.id}`,
          firstName: userObj?.username || 'Learner',
          lastName: userObj?.username || 'Learner',
          email: userObj?.email || 'student@example.com',
          phone: '00000000',
          orderId: order.id,
          returnUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=subscription`,
          cancelUrl: `${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=subscription`,
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
          firstName: userObj?.username || 'Learner',
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
    }) as any;

    const gateway =
      order.paymentProvider === 'FLOUCI'
        ? 'flouci'
        : order.paymentProvider === 'PAYMEE'
        ? 'paymee'
        : order.paymentProvider === 'KONNECT'
        ? 'konnect'
        : (config?.paymentGateway || 'konnect').toLowerCase();
    let status = '';
    let providerPaymentId: string | null = null;

    if (gateway === 'flouci') {
      const { publicKey, privateKey } = resolveFlouciCredentials(config || undefined);
      const payment = await verifyFlouciPayment({
        paymentId: order.providerOrderId || paymentRef,
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
        sendError(res, 'Paymee payment is not configured', 400);
        return;
      }
      const paymentDetails = await verifyPaymeePayment({
        apiToken: config.paymeeApiToken,
        token: paymentRef,
      });
      status = paymentDetails.paid ? 'completed' : paymentDetails.status;
      providerPaymentId = paymentDetails.transactionId;
    } else {
      if (!config?.konnectApiKey) {
        sendError(res, 'Konnect payment is not configured', 400);
        return;
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
        paymentProvider: gateway === 'flouci' ? 'FLOUCI' : gateway === 'paymee' ? 'PAYMEE' : 'KONNECT',
        paymentStatus: 'SUCCESS',
        providerPaymentId,
        failureReason: null,
        completedAt: new Date(),
      },
    });

    sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Subscription activated successfully' });
  } catch (e) { next(e); }
};
