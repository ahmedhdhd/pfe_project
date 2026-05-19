const normalizeBaseUrl = (value?: string) => {
  const raw = (value || 'https://sandbox.paymee.tn').trim();
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, '');
};

const PAYMEE_API_BASE_URL = normalizeBaseUrl(process.env.PAYMEE_API_BASE_URL);
const PAYMEE_TIMEOUT_MS = Number(process.env.PAYMEE_TIMEOUT_MS || 15000);
const PAYMEE_FALLBACK_BASE_URLS = [
  PAYMEE_API_BASE_URL,
  'https://app.paymee.tn',
  'https://sandbox.paymee.tn',
].filter((value, index, list) => list.indexOf(value) === index);

type CreatePaymeePaymentInput = {
  apiToken: string;
  vendor?: string | number;
  amount: number; // in TND
  note: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl?: string;
  orderId: string;
};

type VerifyPaymeePaymentInput = {
  apiToken: string;
  token: string;
};

const paymeeHeaders = (apiToken: string) => ({
  Authorization: `Token ${apiToken.trim()}`,
  'Content-Type': 'application/json',
});

const paymeeFetch = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAYMEE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    throw new Error(
      `Paymee request failed (${url}). Check PAYMEE_API_BASE_URL, internet access, firewall, and TLS. Root cause: ${message}`
    );
  } finally {
    clearTimeout(timeout);
  }
};

const isTransportFailure = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('econnrefused')
  );
};

const isInvalidTokenPayload = (payload: unknown) => {
  const text = JSON.stringify(payload || {}).toLowerCase();
  return text.includes('invalid token');
};

export async function createPaymeePayment(input: CreatePaymeePaymentInput) {
  const vendorRaw = String(input.vendor ?? process.env.PAYMEE_VENDOR ?? '').trim();
  const vendor = Number(vendorRaw);
  if (!Number.isFinite(vendor) || vendor <= 0) {
    throw new Error(
      'Paymee vendor is required. Set paymeeVendor in admin settings (or PAYMEE_VENDOR env).'
    );
  }

  let response: Response | null = null;
  let lastTransportError: unknown = null;
  let lastApiErrorPayload: unknown = null;
  let resolvedBaseUrl = PAYMEE_API_BASE_URL;

  for (const baseUrl of PAYMEE_FALLBACK_BASE_URLS) {
    try {
      const currentResponse = await paymeeFetch(`${baseUrl}/api/v1/payments/create`, {
        method: 'POST',
        headers: paymeeHeaders(input.apiToken),
        body: JSON.stringify({
          vendor,
          amount: Number(input.amount.toFixed(3)),
          note: input.note,
        }),
      });
      const payload = await currentResponse.json().catch(() => ({}));
      if (!currentResponse.ok) {
        lastApiErrorPayload = payload;
        if (isInvalidTokenPayload(payload)) {
          continue;
        }
        throw new Error(`Paymee create payment failed: ${JSON.stringify(payload)}`);
      }

      response = new Response(JSON.stringify(payload), {
        status: currentResponse.status,
        statusText: currentResponse.statusText,
        headers: currentResponse.headers,
      });
      resolvedBaseUrl = baseUrl;
      break;
    } catch (error) {
      lastTransportError = error;
      if (!isTransportFailure(error)) {
        throw error;
      }
    }
  }

  if (!response) {
    if (lastApiErrorPayload) {
      throw new Error(`Paymee create payment failed: ${JSON.stringify(lastApiErrorPayload)}`);
    }
    throw lastTransportError instanceof Error
      ? lastTransportError
      : new Error('Paymee request failed on all base URLs');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Paymee create payment failed: ${JSON.stringify(payload)}`);
  }

  const data = payload?.data || payload;
  const token = data?.token || data?.payment_token || data?.id;
  const payUrl =
    data?.payment_url ||
    data?.pay_url ||
    (token ? `${resolvedBaseUrl}/${token}` : null);

  if (!token || !payUrl) {
    throw new Error('Paymee response missing token or payment URL');
  }

  return {
    token: String(token),
    payUrl: String(payUrl),
    raw: payload,
  };
}

export async function verifyPaymeePayment(input: VerifyPaymeePaymentInput) {
  const paths = [
    `/api/v1/payments/${encodeURIComponent(input.token)}/check`,
    `/api/v2/payments/${encodeURIComponent(input.token)}/check`,
    `/api/v2/payments/check/${encodeURIComponent(input.token)}`,
    `/api/v2/payments/${encodeURIComponent(input.token)}`,
  ];

  let lastError = '';
  for (const baseUrl of PAYMEE_FALLBACK_BASE_URLS) {
    for (const path of paths) {
      const response = await paymeeFetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: paymeeHeaders(input.apiToken),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        lastError = JSON.stringify(payload);
        if (isInvalidTokenPayload(payload)) {
          continue;
        }
        continue;
      }

      const data = payload?.data || payload;
      const statusValue = String(
        data?.status ?? data?.payment_status ?? data?.state ?? ''
      ).toLowerCase();

      const isPaid =
        statusValue === 'true' ||
        statusValue === 'paid' ||
        statusValue === 'success' ||
        statusValue === 'completed' ||
        data?.paid === true ||
        data?.success === true;

      return {
        paid: isPaid,
        status: statusValue || (isPaid ? 'paid' : 'unknown'),
        transactionId:
          data?.transaction_id || data?.transactionId || data?.id || null,
        raw: payload,
      };
    }
  }

  throw new Error(`Paymee verify payment failed: ${lastError || 'unknown error'}`);
}
