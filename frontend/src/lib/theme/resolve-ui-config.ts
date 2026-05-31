import type { OrganizationUiConfig, UiConfigPatch } from "./schema";
import { DEFAULT_UI_CONFIG } from "./schema";

export const PRESET_PATCHES: Record<string, UiConfigPatch> = {
  default: {},
  minimal: {
    preset: "minimal",
    tokens: {
      radius: "sm",
      shadow: "flat",
      surface: "solid",
      density: "compact",
    },
    variants: { button: "sharp", card: "flat", sidebar: "light" },
    layout: { homepage: "classic" },
  },
  bold: {
    preset: "bold",
    tokens: {
      radius: "md",
      shadow: "elevated",
      surface: "solid",
      density: "comfortable",
    },
    variants: { button: "default", card: "bordered", sidebar: "brand" },
    layout: { homepage: "split" },
  },
  academic: {
    preset: "academic",
    tokens: {
      primaryColor: "#1e3a5f",
      secondaryColor: "#c9a227",
      fontFamily: "source-serif",
      radius: "sm",
      shadow: "soft",
      surface: "muted",
      density: "comfortable",
    },
    variants: { button: "default", card: "bordered", sidebar: "dark" },
    layout: { homepage: "classic" },
  },
  futuristic: {
    preset: "futuristic",
    tokens: {
      primaryColor: "#2563eb",
      radius: "lg",
      shadow: "elevated",
      surface: "glass",
      density: "comfortable",
    },
    variants: {
      button: "pill",
      card: "glass",
      sidebar: "dark",
      header: "transparent",
    },
    layout: { homepage: "hero-center" },
  },
};

export function mergeUiConfig(
  base: OrganizationUiConfig,
  patch: UiConfigPatch
): OrganizationUiConfig {
  const next: OrganizationUiConfig = { ...base, version: 1 };
  if (patch.preset) next.preset = patch.preset;
  if (patch.tokens) next.tokens = { ...next.tokens, ...patch.tokens };
  if (patch.variants) next.variants = { ...next.variants, ...patch.variants };
  if (patch.layout) next.layout = { ...next.layout, ...patch.layout };
  if (patch.homepage) {
    next.homepage = { ...next.homepage, ...patch.homepage };
    if (patch.homepage.features) next.homepage.features = patch.homepage.features;
    if (patch.homepage.sections) next.homepage.sections = patch.homepage.sections;
    if (patch.homepage.testimonials)
      next.homepage.testimonials = patch.homepage.testimonials;
    if (patch.homepage.faq) next.homepage.faq = patch.homepage.faq;
  }
  return next;
}

export function resolveUiConfig(
  input?: OrganizationUiConfig | null,
  patch?: UiConfigPatch | null
): OrganizationUiConfig {
  let config: OrganizationUiConfig = {
    ...DEFAULT_UI_CONFIG,
    ...(input?.version === 1 ? input : {}),
    tokens: { ...DEFAULT_UI_CONFIG.tokens, ...input?.tokens },
    variants: { ...DEFAULT_UI_CONFIG.variants, ...input?.variants },
    layout: { ...DEFAULT_UI_CONFIG.layout, ...input?.layout },
    homepage: { ...DEFAULT_UI_CONFIG.homepage, ...input?.homepage },
    version: 1,
  };

  if (patch?.preset && PRESET_PATCHES[patch.preset]) {
    config = mergeUiConfig(config, PRESET_PATCHES[patch.preset]);
  }
  if (patch) {
    config = mergeUiConfig(config, patch);
  }

  return config;
}
