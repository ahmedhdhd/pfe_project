import { Response } from 'express';
import prisma from '../utils/prisma';
import { sendError, sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  createStripeConnectAuthorizeUrl,
  createStripeConnectState,
  exchangeStripeOAuthCode,
  isStripeTestMode,
  provisionStripeTestAccount,
  retrieveStripeAccount,
  verifyStripeConnectState,
} from '../utils/stripeConnect';

export const startStripeConnect = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const state = createStripeConnectState({
      organizationId: req.user!.organizationId,
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
  const frontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || '';

  const redirectWithStatus = (status: 'connected' | 'failed', reason?: string) => {
    if (!frontendUrl) {
      sendError(res, 'FRONTEND_URL is not configured on the backend', 500);
      return;
    }

    const redirectUrl = new URL('/admin/settings', `${frontendUrl}/`);
    redirectUrl.searchParams.set('stripe_connect', status);
    if (reason) {
      redirectUrl.searchParams.set('reason', reason);
    }
    res.redirect(redirectUrl.toString());
  };

  try {
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    const state = typeof req.query.state === 'string' ? req.query.state.trim() : '';
    const error = typeof req.query.error === 'string' ? req.query.error.trim() : '';
    const errorDescription =
      typeof req.query.error_description === 'string'
        ? req.query.error_description.trim()
        : '';

    if (error) {
      redirectWithStatus('failed', errorDescription || error);
      return;
    }

    if (!code || !state) {
      sendError(res, 'Stripe callback is missing required parameters', 400);
      return;
    }

    const decodedState = verifyStripeConnectState(state);
    const tokenResponse = await exchangeStripeOAuthCode(code);
    const connectedAccountId = tokenResponse.stripe_user_id;

    /* ───── Test mode: auto-provision the account so charges are enabled ───── */
    let chargesEnabled: boolean;
    let payoutsEnabled: boolean;
    let detailsSubmitted: boolean;

    if (isStripeTestMode()) {
      const provisioned = await provisionStripeTestAccount(connectedAccountId);
      chargesEnabled = provisioned.chargesEnabled;
      payoutsEnabled = provisioned.payoutsEnabled;
      detailsSubmitted = provisioned.detailsSubmitted;
    } else {
      const account = await retrieveStripeAccount(connectedAccountId);
      chargesEnabled = account.charges_enabled;
      payoutsEnabled = account.payouts_enabled;
      detailsSubmitted = account.details_submitted;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: decodedState.organizationId },
      select: { name: true, slug: true },
    });

    if (!organization) {
      redirectWithStatus('failed', 'Organization not found');
      return;
    }

    await prisma.organizationConfig.upsert({
      where: { organizationId: decodedState.organizationId },
      create: {
        organizationId: decodedState.organizationId,
        name: organization.name,
        slug: organization.slug,
        paymentGateway: 'STRIPE_CONNECT',
        stripeAccountId: connectedAccountId,
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        stripeDetailsSubmitted: detailsSubmitted,
        stripeConnectedAt: new Date(),
      } as any,
      update: {
        paymentGateway: 'STRIPE_CONNECT',
        stripeAccountId: connectedAccountId,
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
        stripeDetailsSubmitted: detailsSubmitted,
        stripeConnectedAt: new Date(),
      } as any,
    });

    redirectWithStatus('connected');
  } catch (error) {
    redirectWithStatus(
      'failed',
      error instanceof Error ? error.message : 'Failed to connect Stripe account'
    );
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

