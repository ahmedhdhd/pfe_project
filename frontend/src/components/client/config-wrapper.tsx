"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useOrganizationConfig } from "@/hooks/api";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import { ClientThemeProvider } from "./theme-provider";
import { OptimisticConfigProvider } from "./optimistic-config-provider";
import { getCachedConfig, setCachedConfig } from "@/lib/config/cache";

interface ClientConfigWrapperProps {
  children: React.ReactNode;
}

export function ClientConfigWrapper({ children }: ClientConfigWrapperProps) {
  const params = useParams();
  const clientSlug = params.client as string;

  const {
    config: storedConfig,
    setConfig,
    setLoading,
  } = useOrganizationConfigStore();
  const { data, isLoading, error } = useOrganizationConfig(clientSlug);

  // Check cache IMMEDIATELY on mount (before API call)
  useEffect(() => {
    if (!clientSlug || clientSlug === "default") return;

    const cached = getCachedConfig(clientSlug);
    if (cached && !storedConfig) {
      // Apply cached config INSTANTLY - user sees correct theme immediately!
      setConfig(cached);
    }
  }, [clientSlug, storedConfig, setConfig]);

  // Update store and cache when API data arrives
  useEffect(() => {
    setLoading(isLoading);

    if (data?.success && data?.data) {
      setConfig(data.data);
      // Update cache for next visit
      setCachedConfig(clientSlug, data.data);
    }
  }, [data, isLoading, setConfig, setLoading, clientSlug]);

  // Show maintenance mode if enabled
  if (storedConfig?.maintenanceMode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-4xl font-bold">Under Maintenance</h1>
          <p className="text-muted-foreground max-w-md">
            We&apos;re currently performing scheduled maintenance. Please check
            back soon.
          </p>
        </div>
      </div>
    );
  }

  // Show error state ONLY if no cached config exists
  // If cached config exists, show content with cached theme (graceful degradation)
  if (error && !storedConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-4xl font-bold text-destructive">
            Configuration Error
          </h1>
          <p className="text-muted-foreground max-w-md">
            Unable to load organization configuration. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // 🎯 NO LOADING STATE!
  // User either sees cached config instantly OR default theme
  // API fetch happens in background - theme updates seamlessly

  return (
    <OptimisticConfigProvider subdomain={clientSlug}>
      <ClientThemeProvider>{children}</ClientThemeProvider>
    </OptimisticConfigProvider>
  );
}
