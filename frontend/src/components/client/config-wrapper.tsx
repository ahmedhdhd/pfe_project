"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useOrganizationConfig } from "@/hooks/api";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import { ClientThemeProvider } from "./theme-provider";
import { OptimisticConfigProvider } from "./optimistic-config-provider";
import { getCachedConfig, setCachedConfig } from "@/lib/config/cache";
import {
  getPlatformPreviewConfig,
  isEmbedPreviewMode,
  organizationConfigsEqual,
  PREVIEW_CONFIG_MESSAGE,
  setPlatformPreviewConfig,
} from "@/lib/platform-preview";
import type { OrganizationConfig } from "@/lib/types/api";

interface ClientConfigWrapperProps {
  children: React.ReactNode;
}

export function ClientConfigWrapper({ children }: ClientConfigWrapperProps) {
  const params = useParams();
  const clientSlug = params.client as string;
  const embedPreview = useRef(
    typeof window !== "undefined" ? isEmbedPreviewMode() : false
  ).current;

  const setConfig = useOrganizationConfigStore((state) => state.setConfig);
  const setLoading = useOrganizationConfigStore((state) => state.setLoading);
  const storedConfig = useOrganizationConfigStore((state) => state.config);

  const { data, isLoading, error } = useOrganizationConfig(
    embedPreview ? "" : clientSlug
  );

  const [showPreviewBanner, setShowPreviewBanner] = useState(embedPreview);

  const applyConfig = useCallback(
    (config: OrganizationConfig) => {
      const current = useOrganizationConfigStore.getState().config;
      if (organizationConfigsEqual(current, config)) {
        return;
      }
      setConfig(config);
    },
    [setConfig]
  );

  // Initial load: session preview or cache (once per slug)
  useEffect(() => {
    if (!clientSlug || clientSlug === "default") return;

    const preview = getPlatformPreviewConfig(clientSlug);
    if (preview) {
      applyConfig(preview);
      setShowPreviewBanner(true);
      return;
    }

    if (embedPreview) {
      setShowPreviewBanner(true);
      return;
    }

    const cached = getCachedConfig(clientSlug);
    if (cached) {
      applyConfig(cached);
    }
  }, [clientSlug, embedPreview, applyConfig]);

  // API data — skip while embedded onboarding preview is active
  useEffect(() => {
    if (embedPreview) {
      setLoading(false);
      return;
    }

    setLoading(isLoading);

    if (getPlatformPreviewConfig(clientSlug)) {
      setShowPreviewBanner(true);
      return;
    }

    if (data?.success && data?.data) {
      applyConfig(data.data);
      setCachedConfig(clientSlug, data.data);
    }
  }, [data, isLoading, clientSlug, embedPreview, applyConfig, setLoading]);

  // Live preview updates from parent (onboarding)
  useEffect(() => {
    if (!clientSlug) return;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== PREVIEW_CONFIG_MESSAGE) return;
      if (event.data.slug !== clientSlug) return;

      const config = event.data.config as OrganizationConfig;
      setPlatformPreviewConfig(clientSlug, config);
      applyConfig(config);
      setShowPreviewBanner(true);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clientSlug, applyConfig]);

  if (storedConfig?.maintenanceMode && !embedPreview) {
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

  if (error && !storedConfig && !embedPreview) {
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

  return (
    <OptimisticConfigProvider subdomain={clientSlug} skipFetch={embedPreview}>
      {showPreviewBanner && !embedPreview && (
        <div className="bg-amber-500 text-amber-950 text-center text-sm py-2 px-4">
          Preview mode — changes are not saved until you launch or apply.
        </div>
      )}
      {showPreviewBanner && embedPreview && (
        <div className="bg-primary/10 text-primary text-center text-[11px] py-1.5 px-2 border-b shrink-0">
          Homepage preview — setup chat is on the left panel only
        </div>
      )}
      <ClientThemeProvider>{children}</ClientThemeProvider>
    </OptimisticConfigProvider>
  );
}
