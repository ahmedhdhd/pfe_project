import crypto from 'crypto';

const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const CONNECT_BASE = 'https://connect.stripe.com';
const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR']);

type StripeGateway = 'KONNECT' | 'STRIPE_CONNECT';

type StripeApiError = {
  error?: {
    message?: string;
  };
};

export type StripeConnectAccountStatus = {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  country?: string | null;
};

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  payment_status?: string | null;
  payment_intent?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
};

const getEnv = (name: string, fallback = '') => process.env[name]?.trim() || fallback;

export const getStripeConfig = () => {
  const secretKey = getEnv('STRIPE_SECRET_KEY');
  const clientId = getEnv('STRIPE_CLIENT_ID');
  const frontendUrl = getEnv('FRONTEND_URL');
  const redirectUri = getEnv(
    'STRIPE_CONNECT_REDIRECT_URI',
    `${getEnv('FRONTEND_URL')}/admin/organization-config/config/stripe/callback`
  );
  const stateSecret = getEnv('STRIPE_CONNECT_STATE_SECRET', getEnv('JWT_SECRET'));

  return {
    secretKey,
    clientId,
    frontendUrl,
    redirectUri,
    stateSecret,
  };
};

export const normalizePaymentGateway = (value: unknown): StripeGateway => {
  if (typeof value !== 'string') {
    return 'KONNECT';
  }

  return value.trim().toUpperCase() === 'STRIPE_CONNECT'
    ? 'STRIPE_CONNECT'
    : 'KONNECT';
};

export const isStripeCurrencySupported = (currency: unknown) => {
  if (typeof currency !== 'string') {
    return false;
  }

  const normalized = currency.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(normalized) || normalized === 'TND';
};

export const normalizeStripeCurrency = (currency: unknown) => {
  if (!isStripeCurrencySupported(currency)) {
    return null;
  }

  const normalized = (currency as string).trim().toUpperCase();
  // Stripe does not support TND; charge in USD using a fixed conversion rate.
  if (normalized === 'TND') {
    return 'usd';
  }

  return normalized.toLowerCase() as 'usd' | 'eur';
};

export const toStripeMinorUnits = (amount: number, currency: string = 'usd') => {
  let convertedAmount = amount;
  if (currency.trim().toUpperCase() === 'TND') {
    // Approximate rate used for Stripe checkout when org currency is TND.
    convertedAmount = amount * 0.32;
  }

  return Math.max(0, Math.round(convertedAmount * 100));
};

export const getStripeConnectCheckoutBlockReason = (config: {
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean | null;
  currency?: string | null;
}) => {
  if (!config.stripeAccountId) {
    return 'Stripe Connect is not connected for this organization';
  }

  if (!config.stripeChargesEnabled) {
    return 'Stripe is connected but not ready to accept payments yet. Complete Stripe onboarding in admin settings.';
  }

  if (!isStripeCurrencySupported(config.currency)) {
    return 'Stripe Connect checkout supports only USD, EUR, and TND in this project';
  }

  return null;
};

const base64UrlEncode = (value: string) =>
  Buffer.from(value).toString('base64url');

const base64UrlDecode = (value: string) =>
  Buffer.from(value, 'base64url').toString('utf8');

export const createStripeConnectState = (payload: {
  organizationId: string;
  userId: string;
}) => {
  const { stateSecret } = getStripeConfig();
  if (!stateSecret) {
    throw new Error('Stripe Connect state secret is not configured');
  }

  const body = JSON.stringify({
    ...payload,
    ts: Date.now(),
    nonce: crypto.randomUUID(),
  });
  const signature = crypto
    .createHmac('sha256', stateSecret)
    .update(body)
    .digest('hex');

  return `${base64UrlEncode(body)}.${signature}`;
};

export const verifyStripeConnectState = (state: string) => {
  const { stateSecret } = getStripeConfig();
  if (!stateSecret) {
    throw new Error('Stripe Connect state secret is not configured');
  }

  const [encodedBody, signature] = state.split('.');
  if (!encodedBody || !signature) {
    throw new Error('Invalid Stripe Connect state');
  }

  const body = base64UrlDecode(encodedBody);
  const expectedSignature = crypto
    .createHmac('sha256', stateSecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new Error('Invalid Stripe Connect state signature');
  }

  const parsed = JSON.parse(body) as {
    organizationId: string;
    userId: string;
    ts: number;
    nonce: string;
  };

  return parsed;
};

const stripeRequest = async <T>(
  path: string,
  options: {
    method?: string;
    body?: URLSearchParams;
  } = {}
): Promise<T> => {
  const { secretKey } = getStripeConfig();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(options.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: options.body,
  });

  const raw = (await response.json().catch(() => ({}))) as StripeApiError & T;
  if (!response.ok) {
    throw new Error(raw.error?.message || `Stripe request failed (${response.status})`);
  }

  return raw as T;
};

export const createStripeConnectAuthorizeUrl = (params: {
  state: string;
}) => {
  const { clientId, redirectUri } = getStripeConfig();
  if (!clientId) {
    throw new Error('STRIPE_CLIENT_ID is not configured');
  }

  const url = new URL(`${CONNECT_BASE}/oauth/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', params.state);
  return url.toString();
};

export const exchangeStripeOAuthCode = async (code: string) => {
  const { clientId, secretKey, redirectUri } = getStripeConfig();
  if (!clientId || !secretKey) {
    throw new Error('Stripe Connect credentials are not configured');
  }

  const body = new URLSearchParams({
    client_secret: secretKey,
    code,
    grant_type: 'authorization_code',
    client_id: clientId,
  });

  return stripeRequest<{
    stripe_user_id: string;
    stripe_publishable_key: string;
    scope: string;
    livemode: boolean;
    refresh_token?: string;
    access_token?: string;
    token_type: string;
  }>('/oauth/token', {
    method: 'POST',
    body,
  });
};

export const retrieveStripeAccount = async (accountId: string) =>
  stripeRequest<{
    id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    country?: string | null;
  }>(`/accounts/${accountId}`);

export const createStripeCheckoutSession = async (params: {
  connectedAccountId: string;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  orderId: string;
  organizationId: string;
  itemName: string;
  customerEmail?: string | null;
  customerName?: string | null;
}) => {
  const stripeCurrency = normalizeStripeCurrency(params.currency);
  if (!stripeCurrency) {
    throw new Error('Stripe Connect currently supports only USD and EUR in this project');
  }

  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', params.successUrl);
  body.set('cancel_url', params.cancelUrl);
  body.set('client_reference_id', params.orderId);
  if (params.customerEmail) {
    body.set('customer_email', params.customerEmail);
  }
  body.set('payment_intent_data[transfer_data][destination]', params.connectedAccountId);
  body.set('payment_intent_data[metadata][orderId]', params.orderId);
  body.set('payment_intent_data[metadata][organizationId]', params.organizationId);
  body.set('line_items[0][price_data][currency]', stripeCurrency);
  body.set(
    'line_items[0][price_data][unit_amount]',
    String(toStripeMinorUnits(params.amount, params.currency))
  );
  body.set('line_items[0][price_data][product_data][name]', params.itemName);
  body.set(
    'line_items[0][price_data][product_data][description]',
    params.customerName || params.itemName
  );
  body.set('line_items[0][quantity]', '1');

  return stripeRequest<{
    id: string;
    url: string | null;
  }>('/checkout/sessions', {
    method: 'POST',
    body,
  });
};

export const retrieveStripeCheckoutSession = async (sessionId: string) =>
  stripeRequest<StripeCheckoutSession>(`/checkout/sessions/${sessionId}`);
