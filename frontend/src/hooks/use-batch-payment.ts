import { useCallback } from "react";
import { useKonnectPaymentCommon } from "./use-konnect-payment";

/**
 * Hook for batch Konnect payments.
 * Redirects the learner to Konnect's hosted checkout page.
 */
export const useBatchKonnectPayment = () => {
  const { initializePayment: initializePaymentCommon, isLoading } =
    useKonnectPaymentCommon();

  const initializePayment = useCallback(
    async (
      batchId: string,
      onFailure?: (error: Error | unknown) => void
    ) => {
      await initializePaymentCommon({
        type: "batch",
        entityId: batchId,
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

// Keep legacy export name for any files still referencing it (will be cleaned up)
/** @deprecated Use useBatchKonnectPayment */
export const useBatchFlouciPayment = useBatchKonnectPayment;
