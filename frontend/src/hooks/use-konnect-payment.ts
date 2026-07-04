"use client";

import { useCallback } from "react";
import { useCreateBatchKonnectCheckout } from "./api";

export type PaymentType = "batch";

interface PaymentConfig {
  type: PaymentType;
  entityId: string;
  onFailure?: (error: Error | unknown) => void;
}

export const useKonnectPaymentCommon = () => {
  const batchCheckoutMutation = useCreateBatchKonnectCheckout();

  const initializePayment = useCallback(
    async (config: PaymentConfig) => {
      try {
        const response = await batchCheckoutMutation.mutateAsync(config.entityId);

        const checkoutUrl =
          response.data?.payUrl || response.data?.paymentLink;

        if (!response.success || !checkoutUrl) {
          throw new Error(
            response.message || "Failed to initialize payment checkout"
          );
        }

        window.location.assign(checkoutUrl);
      } catch (error: unknown) {
        console.error("Payment initialization error:", error);
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        config.onFailure?.(errorInstance);
      }
    },
    [batchCheckoutMutation]
  );

  return {
    initializePayment,
    isLoading: batchCheckoutMutation.isPending,
  };
};
