"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/common/error-boundary";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to external service in production
        if (process.env.NODE_ENV === "production") {
          // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
          console.error("Error caught by boundary:", error, errorInfo);
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="teslaacademy-theme">
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
