import type { OrganizationConfig } from "@/lib/types/api";
import type { OrganizationUiConfig, UiConfigPatch } from "@/lib/theme/schema";
import { resolveUiConfig } from "@/lib/theme/resolve-ui-config";
import { legacyConfigToUiConfig } from "@/lib/theme/legacy-adapter";

/** UI-only onboarding state accumulated from chat parsing. */
export interface OnboardingPartialConfig {
  organizationName?: string;
  uiPatch?: UiConfigPatch;
  customCSS?: string;
}

export interface OnboardingMessage {
  role: "user" | "assistant";
  content: string;
}

export interface OnboardingChatResponse {
  success: boolean;
  data: {
    reply: string;
    done: boolean;
  };
}

export interface OnboardingParseResponse {
  success: boolean;
  data: OnboardingPartialConfig;
}

export const ONBOARDING_TOTAL_STEPS = 6;

export function mergeOnboardingPartial(
  prev: OnboardingPartialConfig,
  next: OnboardingPartialConfig
): OnboardingPartialConfig {
  const uiPatch: UiConfigPatch = {
    ...prev.uiPatch,
    ...next.uiPatch,
    tokens: { ...prev.uiPatch?.tokens, ...next.uiPatch?.tokens },
    variants: { ...prev.uiPatch?.variants, ...next.uiPatch?.variants },
    layout: { ...prev.uiPatch?.layout, ...next.uiPatch?.layout },
    homepage: { ...prev.uiPatch?.homepage, ...next.uiPatch?.homepage },
  };
  if (next.uiPatch?.homepage?.features)
    uiPatch.homepage = {
      ...uiPatch.homepage,
      features: next.uiPatch.homepage.features,
    };
  if (next.uiPatch?.homepage?.sections)
    uiPatch.homepage = {
      ...uiPatch.homepage,
      sections: next.uiPatch.homepage.sections,
    };

  return {
    organizationName: next.organizationName ?? prev.organizationName,
    customCSS: next.customCSS ?? prev.customCSS,
    uiPatch: Object.keys(uiPatch).length ? uiPatch : prev.uiPatch,
  };
}

export function countOnboardingProgress(partial: OnboardingPartialConfig): number {
  const p = partial.uiPatch || {};
  let n = 0;
  if (partial.organizationName) n++;
  if (p.preset) n++;
  if (p.tokens?.primaryColor) n++;
  if (p.tokens?.fontFamily || p.variants?.button) n++;
  if (p.homepage?.heroTitle) n++;
  if (p.homepage?.heroSubtitle) n++;
  return Math.min(n, ONBOARDING_TOTAL_STEPS);
}

export function onboardingToLaunchPayload(
  partial: OnboardingPartialConfig,
  organizationId: string,
  slug: string
) {
  return {
    organizationId,
    slug,
    name: partial.organizationName,
    uiPatch: partial.uiPatch || {},
    customCSS: partial.customCSS,
  };
}

export function hasMeaningfulUiPatch(patch?: UiConfigPatch): boolean {
  if (!patch) return false;

  if (patch.preset) return true;
  if (patch.tokens && Object.values(patch.tokens).some(Boolean)) return true;
  if (patch.variants && Object.values(patch.variants).some(Boolean)) return true;
  if (patch.layout && Object.values(patch.layout).some(Boolean)) return true;
  if (!patch.homepage) return false;

  const hp = patch.homepage;
  if (hp.heroTitle || hp.heroSubtitle || hp.ctaText || hp.ctaUrl) return true;
  if (Array.isArray(hp.sections) && hp.sections.length > 0) return true;
  if (Array.isArray(hp.features) && hp.features.length > 0) return true;
  if (Array.isArray(hp.testimonials) && hp.testimonials.length > 0) return true;
  if (Array.isArray(hp.faq) && hp.faq.length > 0) return true;

  return false;
}

export function buildOnboardingPreviewConfig(
  partial: OnboardingPartialConfig,
  options: {
    organizationId: string;
    slug: string;
    base?: OrganizationConfig | null;
  }
): OrganizationConfig {
  const base = options.base;
  const baseUi = legacyConfigToUiConfig(base);
  const resolvedUi = resolveUiConfig(baseUi, partial.uiPatch);

  const primary =
    resolvedUi.tokens?.primaryColor ||
    base?.theme?.primaryColor ||
    "#6366f1";
  const secondary =
    resolvedUi.tokens?.secondaryColor ||
    base?.theme?.secondaryColor ||
    "#ec4899";

  const hp = resolvedUi.homepage || {};

  return {
    id: base?.id || options.organizationId,
    organizationId: options.organizationId,
    slug: options.slug,
    name: partial.organizationName || base?.name || "Your Academy",
    domain: base?.domain,
    logoUrl: base?.logoUrl,
    faviconUrl: base?.faviconUrl,
    bannerUrls: base?.bannerUrls,
    motto: base?.motto,
    description: base?.description,
    theme: {
      primaryColor: primary,
      secondaryColor: secondary,
      fontFamily: base?.theme?.fontFamily,
    },
    uiConfig: resolvedUi,
    heroTitle:
      hp.heroTitle ||
      base?.heroTitle ||
      `Welcome to ${partial.organizationName || base?.name || "Your Academy"}`,
    heroSubtitle:
      hp.heroSubtitle ||
      base?.heroSubtitle ||
      "Transform your learning experience.",
    ctaText: hp.ctaText || base?.ctaText || "Get Started",
    ctaUrl: hp.ctaUrl || base?.ctaUrl || "/login",
    features:
      hp.features?.map((f) => ({
        title: f.title,
        description: f.description,
        icon: f.icon,
      })) ||
      base?.features ||
      [],
    testimonials:
      hp.testimonials?.map((t) => ({
        name: t.name,
        message: t.message,
      })) ||
      base?.testimonials ||
      [],
    faq: hp.faq || base?.faq || [],
    socialLinks: base?.socialLinks,
    metaTitle: partial.organizationName || base?.metaTitle,
    metaDescription: base?.metaDescription,
    paymentMode: base?.paymentMode,
    currency: base?.currency || "TND",
    maintenanceMode: false,
    customCSS: partial.customCSS || base?.customCSS,
    customJS: undefined,
  };
}
