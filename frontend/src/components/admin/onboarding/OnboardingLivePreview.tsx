"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { OrganizationConfig } from "@/lib/types/api";
import {
  buildOnboardingPreviewConfig,
  type OnboardingPartialConfig,
} from "@/lib/types/onboarding";
import { pushPreviewConfigToIframe } from "@/lib/platform-preview";

interface OnboardingLivePreviewProps {
  slug: string;
  organizationId: string;
  partial: OnboardingPartialConfig;
  baseConfig?: OrganizationConfig | null;
}

export function OnboardingLivePreview({
  slug,
  organizationId,
  partial,
  baseConfig,
}: OnboardingLivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewConfig = useMemo(
    () =>
      buildOnboardingPreviewConfig(partial, {
        organizationId,
        slug,
        base: baseConfig,
      }),
    [partial, organizationId, slug, baseConfig]
  );

  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setIframeSrc(null);
      return;
    }
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    setIframeSrc(`${origin}/${encodeURIComponent(slug)}?embed=preview`);
  }, [slug]);

  const previewSrc = iframeSrc ?? undefined;

  const lastPushedSigRef = useRef("");

  useEffect(() => {
    if (!slug) return;
    const sig = JSON.stringify(previewConfig);
    if (sig === lastPushedSigRef.current) return;
    lastPushedSigRef.current = sig;
    pushPreviewConfigToIframe(iframeRef.current, slug, previewConfig);
  }, [previewConfig, slug]);

  const handleIframeLoad = () => {
    pushPreviewConfigToIframe(iframeRef.current, slug, previewConfig);
  };

  return (
    <div className="relative w-full h-full min-h-0 rounded-xl border bg-muted/30 overflow-hidden shadow-inner">
      <iframe
        ref={iframeRef}
        title="Live platform preview"
        src={previewSrc}
        className="absolute inset-0 h-full w-full border-0 bg-background"
        onLoad={handleIframeLoad}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
      {!slug && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
