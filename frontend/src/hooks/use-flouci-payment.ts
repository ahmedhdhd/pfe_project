"use client";

import { useCallback } from "react";
import { useCreateBatchCheckout } from "./api";
import { useClientCheckoutTestSeries } from "./test-series-client";

export type PaymentType = "batch" | "test-series";

interface PaymentConfig {
  type: PaymentType;
  entityId: string;
  onFailure?: (error: Error | unknown) => void;
}

export const useFlouciPaymentCommon = () => {
  const batchCheckoutMutation = useCreateBatchCheckout();
  const testSeriesCheckoutMutation = useClientCheckoutTestSeries();

  const initializePayment = useCallback(
    async (config: PaymentConfig) => {
      try {
        const response =
          config.type === "batch"
            ? await batchCheckoutMutation.mutateAsync(config.entityId)
            : await testSeriesCheckoutMutation.mutateAsync(config.entityId);

        const paymentLink = response.data?.paymentLink;

        if (!response.success || !paymentLink) {
          throw new Error(
            response.message || "Failed to initialize Flouci checkout"
          );
        }

        window.location.assign(paymentLink);
      } catch (error: unknown) {
        console.error("Flouci payment initialization error:", error);
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
