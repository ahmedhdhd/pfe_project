import { useCallback } from "react";
import { useKonnectPaymentCommon } from "./use-konnect-payment";

/**
 * Hook for test-series Konnect payments.
 * Redirects the learner to Konnect's hosted checkout page.
 */
export const useTestSeriesKonnectPayment = () => {
  const { initializePayment: initializePaymentCommon, isLoading } =
    useKonnectPaymentCommon();

  const initializePayment = useCallback(
    async (
      testSeriesId: string,
      onFailure?: (error: Error | unknown) => void
    ) => {
      await initializePaymentCommon({
        type: "test-series",
        entityId: testSeriesId,
        onFailure,
      });
    },
    [initializePaymentCommon]
  );

  return {
    initializePayment,
    isLoading,
  };
};

// Keep legacy export name for any files still referencing it
/** @deprecated Use useTestSeriesKonnectPayment */
export const useTestSeriesFlouciPayment = useTestSeriesKonnectPayment;
