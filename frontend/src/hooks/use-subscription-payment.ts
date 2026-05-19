"use client";

import { useCallback } from "react";
import { useSubscriptionCheckout } from "./api";

/**
 * Hook for subscription Konnect payments.
 * Redirects the learner to Konnect's hosted checkout page for a subscription.
 */
export const useSubscriptionPayment = () => {
  const checkoutMutation = useSubscriptionCheckout();

  const initializePayment = useCallback(
    async (onFailure?: (error: Error | unknown) => void) => {
      try {
        const response = await checkoutMutation.mutateAsync();

        const checkoutUrl = response.data?.payUrl || response.data?.paymentLink;

        if (!response.success || !checkoutUrl) {
          throw new Error(
            response.message || "Failed to initialize subscription checkout"
          );
        }

        window.location.assign(checkoutUrl);
      } catch (error: unknown) {
        console.error("Subscription payment initialization error:", error);
        const errorInstance =
          error instanceof Error ? error : new Error(String(error));
        onFailure?.(errorInstance);
      }
    },
    [checkoutMutation]
  );

  return {
    initializePayment,
    isLoading: checkoutMutation.isPending,
  };
};
