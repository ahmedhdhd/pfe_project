const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'queztlearn-backend/src/controllers/batch.controller.ts');
let content = fs.readFileSync(file, 'utf8');

const anchor = 'export const enrollFree = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {';

const konnectCode = `
import { createKonnectPayment, verifyKonnectPayment } from '../utils/konnect';

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
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId: batch.organizationId } });
    
    if (!config?.konnectApiKey || !config?.konnectWalletId) {
      sendError(res, 'Konnect payment is not configured for this organization', 400); return;
    }

    const order = await prisma.order.create({
      data: {
        organizationId: batch.organizationId,
        userId: req.user!.userId,
        entityType: 'BATCH',
        entityId: batchId,
        amount: discounted,
        currency: PAYMENT_CURRENCY,
        paymentProvider: 'KONNECT',
        receiptId: uuidv4(),
        paymentStatus: 'PENDING',
      },
    });

    try {
      const payment = await createKonnectPayment(config.konnectApiKey, {
        receiverWalletId: config.konnectWalletId,
        amount: amountMillimes,
        token: config.currency === 'USD' || config.currency === 'EUR' ? config.currency : 'TND',
        orderId: order.id,
        firstName: req.user!.username,
        email: req.user!.email || undefined,
        successUrl: \`\${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=\${batchId}\`,
        failUrl: \`\${process.env.FRONTEND_URL}/student/payment/konnect?payment_ref={paymentRef}&type=batch&entityId=\${batchId}\`,
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
          failureReason: error instanceof Error ? error.message : 'Failed to initialize Konnect payment',
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
      await prisma.batchEnrollment.upsert({
        where: { batchId_userId: { batchId: order.entityId, userId: req.user!.userId } },
        update: { isFree: false },
        create: { batchId: order.entityId, userId: req.user!.userId, isFree: false },
      });
      sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Payment already verified, enrolled successfully' });
      return;
    }

    const config = await prisma.organizationConfig.findUnique({ where: { organizationId: order.organizationId } });
    if (!config?.konnectApiKey) {
      sendError(res, 'Konnect payment is not configured', 400); return;
    }

    const paymentDetails = await verifyKonnectPayment(config.konnectApiKey, paymentRef);
    const status = paymentDetails.payment.status;

    if (status !== 'completed') {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: status === 'pending' ? 'PENDING' : 'FAILED',
          failureReason: status === 'pending' ? 'Payment is still pending' : \`Konnect status: \${status}\`,
          providerPaymentId: paymentDetails.payment.id,
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
        paymentProvider: 'KONNECT',
        paymentStatus: 'SUCCESS',
        providerPaymentId: paymentDetails.payment.id,
        failureReason: null,
        completedAt: new Date(),
      },
    });

    await prisma.batchEnrollment.upsert({
      where: { batchId_userId: { batchId: order.entityId, userId: req.user!.userId } },
      update: { isFree: false },
      create: { batchId: order.entityId, userId: req.user!.userId, isFree: false },
    });

    sendSuccess(res, { verified: true, status: 'SUCCESS', message: 'Payment verified, enrolled successfully' });
  } catch (e) { next(e); }
};

${anchor}`;

if (!content.includes(anchor)) {
  console.error('Anchor not found!');
  process.exit(1);
}

// Add import if not present
let newContent = content.replace(anchor, konnectCode);

fs.writeFileSync(file, newContent, 'utf8');
console.log('Done inject-batch-konnect.js');
