"use client";

import { useCallback } from "react";
import { useCreateBatchKonnectCheckout } from "./api";
import { useClientCheckoutTestSeriesKonnect } from "./test-series-client";

export type PaymentType = "batch" | "test-series";

interface PaymentConfig {
  type: PaymentType;
  entityId: string;
  onFailure?: (error: Error | unknown) => void;
}

export const useKonnectPaymentCommon = () => {
  const batchCheckoutMutation = useCreateBatchKonnectCheckout();
  const testSeriesCheckoutMutation = useClientCheckoutTestSeriesKonnect();

  const initializePayment = useCallback(
    async (config: PaymentConfig) => {
      try {
        const response =
          config.type === "batch"
            ? await batchCheckoutMutation.mutateAsync(config.entityId)
            : await testSeriesCheckoutMutation.mutateAsync(config.entityId);

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
    [batchCheckoutMutation, testSeriesCheckoutMutation]
  );

  return {
    initializePayment,
    isLoading:
      batchCheckoutMutation.isPending || testSeriesCheckoutMutation.isPending,
  };
};
