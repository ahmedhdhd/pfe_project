import axios from 'axios';

const DEFAULT_KONNECT_API_BASE = 'https://api.sandbox.konnect.network/api/v2';
const KONNECT_API_BASE = (
  process.env.KONNECT_API_BASE || DEFAULT_KONNECT_API_BASE
).replace(/\/+$/, '');

export interface KonnectInitRequest {
  receiverWalletId: string;
  amount: number; // in Millimes
  token?: 'TND' | 'USD' | 'EUR';
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  orderId: string;
  successUrl: string;
  failUrl: string;
  webhook?: string;
  theme?: 'light' | 'dark';
}

export interface KonnectInitResponse {
  payUrl: string;
  paymentRef: string;
}

export interface KonnectPaymentDetails {
  payment: {
    id: string;
    status: 'pending' | 'completed' | 'failed' | 'canceled';
    amount: number;
    transactions?: any[];
  };
}

export const createKonnectPayment = async (
  apiKey: string,
  payload: KonnectInitRequest
): Promise<KonnectInitResponse> => {
  try {
    const response = await axios.post(
      `${KONNECT_API_BASE}/payments/init-payment`,
      {
        receiverWalletId: payload.receiverWalletId,
        token: payload.token || 'TND',
        amount: payload.amount,
        type: 'immediate',
        description: `Order ${payload.orderId}`,
        lifespan: 15,
        checkoutForm: true,
        addPaymentFeesToAmount: false,
        firstName: payload.firstName,
        lastName: payload.lastName,
        phoneNumber: payload.phoneNumber,
        email: payload.email,
        orderId: payload.orderId,
        successUrl: payload.successUrl,
        failUrl: payload.failUrl,
        theme: payload.theme || 'light',
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      payUrl: response.data.payUrl,
      paymentRef: response.data.paymentRef,
    };
  } catch (error: any) {
    console.error('Konnect initialization error:', error.response?.data || error.message);
    throw new Error('Failed to initialize Konnect payment');
  }
};

export const verifyKonnectPayment = async (
  apiKey: string,
  paymentRef: string
): Promise<KonnectPaymentDetails> => {
  try {
    const response = await axios.get(
      `${KONNECT_API_BASE}/payments/${paymentRef}`,
      {
        headers: {
          'x-api-key': apiKey,
        },
      }
    );

    return response.data as KonnectPaymentDetails;
  } catch (error: any) {
    console.error('Konnect verification error:', error.response?.data || error.message);
    throw new Error('Failed to verify Konnect payment');
  }
};
