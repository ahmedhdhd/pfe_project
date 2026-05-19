"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook for debouncing values
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for debouncing function calls
 */
export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T => {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const newTimeoutId = setTimeout(() => {
        callback(...args);
      }, delay);

      setTimeoutId(newTimeoutId);
    },
    [callback, delay, timeoutId]
  );

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback as T;
};
