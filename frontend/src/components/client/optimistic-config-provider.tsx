"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getConfigWithCache } from "@/lib/config/cache";
import type { OrganizationConfig } from "@/lib/types/api";

/**
 * Default config used for instant rendering (no loading spinner!)
 * Users see content immediately with default theme
 */
const DEFAULT_CONFIG: Partial<OrganizationConfig> = {
  slug: "default",
  name: "TeslaAcademy",
  theme: {
    primaryColor: "#3b82f6", // Blue
    secondaryColor: "#8b5cf6",
  },
  logoUrl: "/images/logo.png",
  faviconUrl: "/favicon.ico",
  motto: "Learning Management System",
  description: "Empowering education through technology",
};

interface ConfigContextValue {
  config: Partial<OrganizationConfig>;
  isLoading: boolean;
  isFromCache: boolean;
  error: Error | null;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULT_CONFIG,
  isLoading: false,
  isFromCache: false,
  error: null,
});

export const useOrgConfig = () => useContext(ConfigContext);

interface OptimisticConfigProviderProps {
  children: React.ReactNode;
  subdomain: string;
  apiUrl?: string;
  /** Skip background API fetch (onboarding iframe preview uses postMessage instead) */
  skipFetch?: boolean;
}

/**
 * Optimistic Config Provider
 *
 * Strategy:
 * 1. Show default theme IMMEDIATELY (no loading spinner!)
 * 2. Check cache in background
 * 3. If cache hit: Apply cached theme seamlessly
 * 4. If cache miss: Fetch from API and apply
 *
 * Result: Users NEVER see a loading spinner!
 */
export function OptimisticConfigProvider({
  children,
  subdomain,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  skipFetch = false,
}: OptimisticConfigProviderProps) {
  const [config, setConfig] =
    useState<Partial<OrganizationConfig>>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (skipFetch) {
      return;
    }
    // Don't fetch for default subdomain
    if (!subdomain || subdomain === "default" || subdomain === "localhost") {
      return;
    }

    let mounted = true;

    async function loadConfig() {
      try {
        // This is FAST - cache check is instant, API is background
        const { config: fetchedConfig, fromCache } = await getConfigWithCache(
          subdomain,
          apiUrl
        );

        if (!mounted) return;

        // Only show loading if fetching fresh (no cache)
        // But even then, user sees default theme immediately!
        setConfig(fetchedConfig);
        setIsFromCache(fromCache);
        setIsLoading(false);

        // Apply theme and config immediately
        applyConfig(fetchedConfig);
      } catch (err) {
        if (!mounted) return;

        console.error("[Config Provider] Failed to load config:", err);
        setError(err as Error);
        setIsLoading(false);

        // Keep default theme on error - still no loading spinner!
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [subdomain, apiUrl, skipFetch]);

  const value: ConfigContextValue = {
    config,
    isLoading,
    isFromCache,
    error,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

/**
 * Apply theme to document immediately
 * This runs INSTANTLY with cached config (no flash!)
 */
function applyTheme(theme?: OrganizationConfig["theme"]) {
  if (typeof document === "undefined" || !theme) return;

  // Apply CSS variables for instant theme change
  const root = document.documentElement;

  if (theme.primaryColor) {
    root.style.setProperty("--color-primary", theme.primaryColor);
  }

  if (theme.secondaryColor) {
    root.style.setProperty("--color-secondary", theme.secondaryColor);
  }

  if (theme.fontFamily) {
    root.style.setProperty("--font-family", theme.fontFamily);
  }
}

/**
 * Apply full config (theme + branding) to document
 */
function applyConfig(config: Partial<OrganizationConfig>) {
  if (typeof document === "undefined") return;

  // Apply theme
  if (config.theme) {
    applyTheme(config.theme);
  }

  // Update favicon if provided
  if (config.faviconUrl) {
    const favicon =
      document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (favicon) {
      favicon.href = config.faviconUrl;
    }
  }

  // Update page title if name exists
  if (config.name) {
    const baseTitle = document.title.split(" | ")[0] || document.title;
    document.title = `${baseTitle} | ${config.name}`;
  }
}

/**
 * Hook for components that need theme values directly
 */
export function useTheme() {
  const { config } = useOrgConfig();
  return config.theme;
}

/**
 * Hook for components that need branding values
 */
export function useBranding() {
  const { config } = useOrgConfig();
  return {
    name: config.name,
    description: config.description,
    motto: config.motto,
    logoUrl: config.logoUrl,
  };
}
