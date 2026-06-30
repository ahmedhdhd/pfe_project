const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR']);

type StripeGateway = 'KONNECT' | 'STRIPE';

type StripeApiError = {
  error?: {
    message?: string;
  };
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
  return { secretKey };
};

export const normalizePaymentGateway = (value: unknown): StripeGateway => {
  if (typeof value !== 'string') {
    return 'KONNECT';
  }

  return value.trim().toUpperCase() === 'STRIPE' ? 'STRIPE' : 'KONNECT';
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

const stripeRequest = async <T>(
  path: string,
  options: {
    method?: string;
    body?: URLSearchParams;
    timeoutMs?: number;
  } = {}
): Promise<T> => {
  const { secretKey } = getStripeConfig();
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const timeoutMs = options.timeoutMs ?? 25_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${STRIPE_API_BASE}${path}`, {
      method: options.method || 'GET',
      signal: controller.signal,
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
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Stripe request timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const createStripeCheckoutSession = async (params: {
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
    throw new Error('Stripe checkout supports only USD, EUR, and TND in this project');
  }

  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', params.successUrl);
  body.set('cancel_url', params.cancelUrl);
  body.set('client_reference_id', params.orderId);
  if (params.customerEmail) {
    body.set('customer_email', params.customerEmail);
  }
  
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
