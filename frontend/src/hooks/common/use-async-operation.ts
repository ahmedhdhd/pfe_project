"use client";

import { useState, useCallback } from "react";
import { useLoadingState } from "./use-loading-state";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";

export interface AsyncOperationOptions<T = unknown> {
  onSuccess?: (result: T) => void;
  onError?: (error: string) => void;
  showSuccessMessage?: boolean;
  successMessage?: string;
}

/**
 * Hook for handling async operations with loading states and error handling
 */
export const useAsyncOperation = <T = unknown>(
  operation: (...args: unknown[]) => Promise<T>,
  options: AsyncOperationOptions<T> = {}
) => {
  const {
    onSuccess,
    onError,
    showSuccessMessage = false,
    successMessage = "Operation completed successfully",
  } = options;

  const loadingState = useLoadingState({
    autoReset: showSuccessMessage,
  });

  const [result, setResult] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T> => {
      try {
        const operationResult = await loadingState.executeWithLoading(() =>
          operation(...args)
        );

        setResult(operationResult);
        onSuccess?.(operationResult);

        if (showSuccessMessage) {
          // You could integrate with a toast notification system here
          console.log(successMessage);
        }

        return operationResult;
      } catch (error) {
        const errorMessage = getFriendlyErrorMessage(error);
        if (errorMessage) {
          onError?.(errorMessage);
        }
        throw error;
      }
    },
    [
      operation,
      loadingState,
      onSuccess,
      onError,
      showSuccessMessage,
      successMessage,
    ]
  );

  const reset = useCallback(() => {
    loadingState.reset();
    setResult(null);
  }, [loadingState]);

  return {
    ...loadingState,
    result,
    execute,
    reset,
  };
};

/**
 * Hook for handling API mutations with React Query integration
 */
export const useApiMutation = <TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: AsyncOperationOptions<TData> = {}
) => {
  const asyncOperation = useAsyncOperation(
    (...args: unknown[]) => mutationFn(args[0] as TVariables),
    options
  );

  const mutate = useCallback(
    (variables: TVariables) => {
      return asyncOperation.execute(variables);
    },
    [asyncOperation]
  );

  return {
    ...asyncOperation,
    mutate,
    mutateAsync: asyncOperation.execute,
  };
};
