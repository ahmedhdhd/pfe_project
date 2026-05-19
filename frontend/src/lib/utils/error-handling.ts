/**
 * Common error handling utilities
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Extract error message from various error formats
 */
export const extractErrorMessage = (error: unknown): string => {
  // Return empty string if error is null or undefined
  if (!error) {
    return "";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    // Axios error format - when API returns HTTP error (400, 401, etc.)
    if ("response" in error) {
      const axiosError = error as {
        response?: {
          data?: {
            message?: string;
            success?: boolean;
          };
          status?: number;
        };
        message?: string;
      };

      // Extract message from response.data.message
      if (axiosError.response?.data?.message) {
        return axiosError.response.data.message;
      }

      // Fallback to error message
      if (axiosError.message) {
        return axiosError.message;
      }

      return "An error occurred";
    }

    // Generic error object
    if ("message" in error) {
      return (error as { message: string }).message;
    }
  }

  return "An unexpected error occurred";
};

/**
 * Extract API error details
 */
export const extractApiError = (error: unknown): ApiError => {
  const message = extractErrorMessage(error);

  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: { message?: string; code?: string };
        status?: number;
      };
    };

    return {
      message: axiosError.response?.data?.message || message,
      code: axiosError.response?.data?.code,
      status: axiosError.response?.status,
    };
  }

  return { message };
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "code" in error) {
    const errorCode = (error as { code: string }).code;
    return errorCode === "NETWORK_ERROR" || errorCode === "ECONNABORTED";
  }
  return false;
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as { response?: { status?: number } };
    return axiosError.response?.status === 401;
  }
  return false;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as { response?: { status?: number } };
    return axiosError.response?.status === 400;
  }
  return false;
};

/**
 * Get user-friendly error message
 */
export const getFriendlyErrorMessage = (error: unknown): string | null => {
  // Return null if error is null, undefined, or falsy
  if (!error) {
    return null;
  }

  // First, try to extract the actual API error message
  const apiMessage = extractErrorMessage(error);

  // If no message extracted or empty string, return null
  if (!apiMessage || apiMessage.trim() === "") {
    return null;
  }

  // Only use generic messages if no specific API message is available
  if (
    apiMessage !== "An error occurred" &&
    apiMessage !== "An unexpected error occurred"
  ) {
    return apiMessage;
  }

  // Fallback to generic messages only if no API message exists
  if (isNetworkError(error)) {
    return "Network error. Please check your connection and try again.";
  }

  if (isAuthError(error)) {
    return "Authentication failed. Please sign in again.";
  }

  if (isValidationError(error)) {
    return "Please check your input and try again.";
  }

  // If we have a generic message, return null instead to avoid showing it
  return null;
};

/**
 * Error logging utility
 */
export const logError = (error: unknown, context?: string): void => {
  const errorMessage = extractErrorMessage(error);
  const timestamp = new Date().toISOString();

  console.error(`[${timestamp}] ${context ? `[${context}] ` : ""}Error:`, {
    message: errorMessage,
    error,
  });
};

/**
 * Retry utility for failed operations
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
};
