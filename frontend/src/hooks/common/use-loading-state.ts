"use client";

import { useState, useCallback } from "react";

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export interface UseLoadingStateOptions {
  initialLoading?: boolean;
  autoReset?: boolean;
  resetDelay?: number;
}

/**
 * Hook for managing loading states with error and success handling
 */
export const useLoadingState = (options: UseLoadingStateOptions = {}) => {
  const {
    initialLoading = false,
    autoReset = false,
    resetDelay = 3000,
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    success: false,
  });

  const setLoading = useCallback((isLoading: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading,
      error: isLoading ? null : prev.error,
      success: isLoading ? false : prev.success,
    }));
  }, []);

  const setError = useCallback(
    (error: string | null) => {
      setState((prev) => ({
        ...prev,
        error,
        isLoading: false,
        success: false,
      }));

      if (autoReset && error) {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            error: null,
          }));
        }, resetDelay);
      }
    },
    [autoReset, resetDelay]
  );

  const setSuccess = useCallback(
    (success: boolean) => {
      setState((prev) => ({
        ...prev,
        success,
        isLoading: false,
        error: null,
      }));

      if (autoReset && success) {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            success: false,
          }));
        }, resetDelay);
      }
    },
    [autoReset, resetDelay]
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: false,
    });
  }, []);

  const executeWithLoading = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const result = await operation();
        setSuccess(true);
        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setSuccess]
  );

  return {
    ...state,
    setLoading,
    setError,
    setSuccess,
    reset,
    executeWithLoading,
  };
};
