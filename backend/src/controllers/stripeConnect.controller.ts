import { Response } from 'express';
import prisma from '../utils/prisma';
import { sendError, sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  createStripeConnectAuthorizeUrl,
  createStripeConnectState,
  createStripeTestAccount,
  exchangeStripeOAuthCode,
  isStripeTestMode,
  retrieveStripeAccount,
  verifyStripeConnectState,
} from '../utils/stripeConnect';

export const startStripeConnect = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;

    /* ───── Test / sandbox shortcut ───── */
    if (isStripeTestMode()) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, slug: true },
      });

      if (!organization) {
        sendError(res, 'Organization not found', 404);
        return;
      }

      const testAccount = await createStripeTestAccount();

      await prisma.organizationConfig.upsert({
        where: { organizationId },
        create: {
          organizationId,
          name: organization.name,
          slug: organization.slug,
          paymentGateway: 'STRIPE_CONNECT',
          stripeAccountId: testAccount.accountId,
          stripeChargesEnabled: testAccount.chargesEnabled,
          stripePayoutsEnabled: testAccount.payoutsEnabled,
          stripeDetailsSubmitted: testAccount.detailsSubmitted,
          stripeConnectedAt: new Date(),
        } as any,
        update: {
          paymentGateway: 'STRIPE_CONNECT',
          stripeAccountId: testAccount.accountId,
          stripeChargesEnabled: testAccount.chargesEnabled,
          stripePayoutsEnabled: testAccount.payoutsEnabled,
          stripeDetailsSubmitted: testAccount.detailsSubmitted,
          stripeConnectedAt: new Date(),
        } as any,
      });

      sendSuccess(
        res,
        {
          testMode: true,
          stripeAccountId: testAccount.accountId,
          stripeChargesEnabled: testAccount.chargesEnabled,
          stripePayoutsEnabled: testAccount.payoutsEnabled,
          stripeDetailsSubmitted: testAccount.detailsSubmitted,
        },
        'Test Stripe account created and linked successfully'
      );
      return;
    }

    /* ───── Normal OAuth flow ───── */
    const state = createStripeConnectState({
      organizationId,
      userId: req.user!.userId,
    });

    sendSuccess(res, {
      url: createStripeConnectAuthorizeUrl({ state }),
    });
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to start Stripe Connect', 400);
  }
};

export const handleStripeConnectCallback = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const error = typeof req.query.error === 'string' ? req.query.error.trim() : '';
    const errorDescription =
      typeof req.query.error_description === 'string'
        ? req.query.error_description.trim()
        : '';

    if (error) {
      const redirectUrl = new URL(`${process.env.FRONTEND_URL}/admin/settings`);
      redirectUrl.searchParams.set('stripe_connect', 'failed');
      redirectUrl.searchParams.set('reason', errorDescription || error);
      res.redirect(redirectUrl.toString());
      return;
    }

    if (!code || !state) {
      sendError(res, 'Stripe callback is missing required parameters', 400);
      return;
    }

    const decodedState = verifyStripeConnectState(state);
    const tokenResponse = await exchangeStripeOAuthCode(code);
    const account = await retrieveStripeAccount(tokenResponse.stripe_user_id);
    const organization = await prisma.organization.findUnique({
      where: { id: decodedState.organizationId },
      select: { name: true, slug: true },
    });

    if (!organization) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    await prisma.organizationConfig.upsert({
      where: { organizationId: decodedState.organizationId },
      create: {
        organizationId: decodedState.organizationId,
        name: organization.name,
        slug: organization.slug,
        paymentGateway: 'STRIPE_CONNECT',
        stripeAccountId: tokenResponse.stripe_user_id,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeConnectedAt: new Date(),
      } as any,
      update: {
        paymentGateway: 'STRIPE_CONNECT',
        stripeAccountId: tokenResponse.stripe_user_id,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
        stripeDetailsSubmitted: account.details_submitted,
        stripeConnectedAt: new Date(),
      } as any,
    });

    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/admin/settings`);
    redirectUrl.searchParams.set('stripe_connect', 'connected');
    res.redirect(redirectUrl.toString());
  } catch (error) {
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/admin/settings`);
    redirectUrl.searchParams.set('stripe_connect', 'failed');
    redirectUrl.searchParams.set(
      'reason',
      error instanceof Error ? error.message : 'Failed to connect Stripe account'
    );
    res.redirect(redirectUrl.toString());
  }
};

export const disconnectStripeConnect = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;

    await prisma.organizationConfig.update({
      where: { organizationId },
      data: {
        paymentGateway: 'KONNECT',
        stripeAccountId: null,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeConnectedAt: null,
      } as any,
    });

    sendSuccess(res, { paymentGateway: 'KONNECT' }, 'Stripe account disconnected');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to disconnect Stripe', 400);
  }
};
