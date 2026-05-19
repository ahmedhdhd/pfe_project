const FLOUCI_API_BASE_URL =
  process.env.FLOUCI_API_BASE_URL?.replace(/\/+$/, "") ||
  "https://developers.flouci.com/api/v2";

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export type FlouciPaymentStatus = "SUCCESS" | "PENDING" | "EXPIRED" | "FAILURE";

type OrganizationPaymentConfig = {
  razorpayKeyId?: string | null;
  razorpayKeySecret?: string | null;
  logoUrl?: string | null;
};

type CreateFlouciPaymentInput = {
  amountMillimes: number;
  publicKey: string;
  privateKey: string;
  successLink: string;
  failLink: string;
  trackingId: string;
  clientId?: string;
  imageUrl?: string;
};

type VerifyFlouciPaymentInput = {
  paymentId: string;
  publicKey: string;
  privateKey: string;
};

type FlouciApiResult = Record<string, unknown>;

export function resolveFlouciCredentials(config?: OrganizationPaymentConfig) {
  const publicKey =
    config?.razorpayKeyId?.trim() ||
    process.env.FLOUCI_PUBLIC_KEY?.trim() ||
    process.env.RAZORPAY_KEY_ID?.trim();
  const privateKey =
    config?.razorpayKeySecret?.trim() ||
    process.env.FLOUCI_PRIVATE_KEY?.trim() ||
    process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!publicKey || !privateKey) {
    throw new Error("Flouci credentials are not configured");
  }

  return { publicKey, privateKey };
}

export function buildFlouciCallbackUrl(input: {
  orderId: string;
  type: "batch" | "test-series" | "subscription";
  entityId: string;
  status: "success" | "failed";
}) {
  const url = new URL("/student/payment/flouci", DEFAULT_FRONTEND_URL);
  url.searchParams.set("orderId", input.orderId);
  url.searchParams.set("type", input.type);
  url.searchParams.set("entityId", input.entityId);
  url.searchParams.set("status", input.status);
  return url.toString();
}

export async function createFlouciPayment(input: CreateFlouciPaymentInput) {
  const payload: Record<string, unknown> = {
    amount: String(input.amountMillimes),
    developer_tracking_id: input.trackingId,
    accept_card: true,
    success_link: input.successLink,
    fail_link: input.failLink,
    session_timeout_secs: 1200,
  };

  if (input.clientId) {
    payload.client_id = input.clientId;
  }

  if (input.imageUrl) {
    payload.image_url = input.imageUrl;
  }

  if (process.env.FLOUCI_WEBHOOK_URL?.trim()) {
    payload.webhook = process.env.FLOUCI_WEBHOOK_URL.trim();
  }

  const data = await callFlouciApi("/generate_payment", {
    method: "POST",
    headers: getFlouciHeaders(input.publicKey, input.privateKey),
    body: JSON.stringify(payload),
  });

  const result = getResultObject(data);
  const paymentId = asString(result.payment_id);
  const link = asString(result.link);

  if (!paymentId || !link) {
    throw new Error("Flouci did not return a valid payment session");
  }

  return { paymentId, link };
}

export async function verifyFlouciPayment(input: VerifyFlouciPaymentInput) {
  const data = await callFlouciApi(
    `/verify_payment/${encodeURIComponent(input.paymentId)}`,
    {
      method: "GET",
      headers: getFlouciHeaders(input.publicKey, input.privateKey),
    }
  );

  const result = getResultObject(data);
  const details =
    result.details && typeof result.details === "object"
      ? (result.details as Record<string, unknown>)
      : {};

  const rawStatus =
    typeof result.status === "string" ? result.status.toUpperCase() : "FAILURE";
  const status: FlouciPaymentStatus =
    rawStatus === "SUCCESS" ||
    rawStatus === "PENDING" ||
    rawStatus === "EXPIRED" ||
    rawStatus === "FAILURE"
      ? rawStatus
      : "FAILURE";

  return {
    status,
    amount:
      typeof result.amount === "number"
        ? result.amount
        : typeof result.amount === "string"
        ? Number(result.amount)
        : null,
    developerTrackingId:
      asString(result.developer_tracking_id),
    orderNumber: asString(details.order_number),
    approvalCode: asString(details.approval_code),
  };
}

function getFlouciHeaders(publicKey: string, privateKey: string) {
  return {
    Authorization: `Bearer ${publicKey}:${privateKey}`,
    "Content-Type": "application/json",
  };
}

async function callFlouciApi(path: string, init: RequestInit) {
  const response = await fetch(`${FLOUCI_API_BASE_URL}${path}`, init);
  const rawBody = await response.text();

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new Error(rawBody || "Unexpected response from Flouci");
  }

  if (!response.ok) {
    const result = getResultObject(data);
    const message =
      typeof result.message === "string"
        ? result.message
        : typeof data.message === "string"
        ? data.message
        : "Flouci request failed";
    throw new Error(message);
  }

  return data;
}

function getResultObject(data: Record<string, unknown>): FlouciApiResult {
  if (data.result && typeof data.result === "object") {
    return data.result as FlouciApiResult;
  }

  return {};
}

function asString(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}
