import type { OrganizationConfig } from "@/lib/types/api";

const PREVIEW_PREFIX = "queztlearn-platform-preview:";
export const PREVIEW_CONFIG_MESSAGE = "QUEZTLEARN_PREVIEW_CONFIG";

/** Stable signature for preview updates — avoids infinite setState loops */
export function organizationConfigSignature(
  config: OrganizationConfig | null | undefined
): string {
  if (!config) return "";
  return JSON.stringify({
    name: config.name,
    slug: config.slug,
    theme: config.theme,
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
    description: config.description,
    motto: config.motto,
    features: config.features,
    featuresEnabled: config.featuresEnabled,
    paymentMode: config.paymentMode,
    ctaText: config.ctaText,
    ctaUrl: config.ctaUrl,
  });
}

export function organizationConfigsEqual(
  a: OrganizationConfig | null | undefined,
  b: OrganizationConfig | null | undefined
): boolean {
  return organizationConfigSignature(a) === organizationConfigSignature(b);
}

export function isEmbedPreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("embed") === "preview";
}

export function setPlatformPreviewConfig(
  slug: string,
  config: OrganizationConfig
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `${PREVIEW_PREFIX}${slug}`,
    JSON.stringify({ config, at: Date.now() })
  );
}

export function pushPreviewConfigToIframe(
  iframe: HTMLIFrameElement | null,
  slug: string,
  config: OrganizationConfig
): boolean {
  if (typeof window === "undefined" || !iframe?.contentWindow) return false;

  const prevRaw = sessionStorage.getItem(`${PREVIEW_PREFIX}${slug}`);
  let prevSig = "";
  if (prevRaw) {
    try {
      const parsed = JSON.parse(prevRaw) as { config: OrganizationConfig };
      prevSig = organizationConfigSignature(parsed.config);
    } catch {
      prevSig = "";
    }
  }
  const nextSig = organizationConfigSignature(config);
  if (prevSig === nextSig) {
    return false;
  }

  setPlatformPreviewConfig(slug, config);
  iframe.contentWindow.postMessage(
    { type: PREVIEW_CONFIG_MESSAGE, slug, config },
    window.location.origin
  );
  return true;
}

export function getPlatformPreviewConfig(
  slug: string
): OrganizationConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREVIEW_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { config: OrganizationConfig; at: number };
    if (Date.now() - parsed.at > 60 * 60 * 1000) {
      clearPlatformPreviewConfig(slug);
      return null;
    }
    return parsed.config;
  } catch {
    return null;
  }
}

export function clearPlatformPreviewConfig(slug: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${PREVIEW_PREFIX}${slug}`);
}
