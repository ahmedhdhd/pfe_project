import type { OrganizationConfig } from "@/lib/types/api";
import type { OrganizationUiConfig, UiHomepageSection } from "./schema";
import { DEFAULT_HOMEPAGE_SECTIONS, DEFAULT_UI_CONFIG } from "./schema";
import { resolveUiConfig } from "./resolve-ui-config";

export function legacyConfigToUiConfig(
  config: OrganizationConfig | null | undefined
): OrganizationUiConfig {
  if (config?.uiConfig?.version === 1) {
    return resolveUiConfig(config.uiConfig);
  }

  const tokens: OrganizationUiConfig["tokens"] = {
    ...DEFAULT_UI_CONFIG.tokens,
  };
  if (config?.theme?.primaryColor) tokens.primaryColor = config.theme.primaryColor;
  if (config?.theme?.secondaryColor)
    tokens.secondaryColor = config.theme.secondaryColor;
  if (config?.theme?.fontFamily) {
    const ff = config.theme.fontFamily.toLowerCase();
    if (ff.includes("serif")) tokens.fontFamily = "source-serif";
    else if (ff.includes("dm")) tokens.fontFamily = "dm-sans";
    else if (ff.includes("geist")) tokens.fontFamily = "geist";
    else tokens.fontFamily = "inter";
  }

  const homepage: OrganizationUiConfig["homepage"] = {
    sections: [...DEFAULT_HOMEPAGE_SECTIONS],
  };
  if (config?.heroTitle) homepage.heroTitle = config.heroTitle;
  if (config?.heroSubtitle) homepage.heroSubtitle = config.heroSubtitle;
  if (config?.ctaText) homepage.ctaText = config.ctaText;
  if (config?.ctaUrl) homepage.ctaUrl = config.ctaUrl;
  if (config?.features?.length) {
    homepage.features = config.features.map((f) => ({
      title: f.title,
      description: f.description,
      icon: f.icon || "brain",
    }));
  }
  if (config?.testimonials?.length) {
    homepage.testimonials = config.testimonials.map((t) => ({
      name: t.name,
      message: t.message,
    }));
  }
  if (config?.faq?.length) {
    homepage.faq = config.faq.map((f) => ({
      question: f.question,
      answer: f.answer,
    }));
  }

  return resolveUiConfig({
    version: 1,
    preset: "default",
    tokens,
    homepage,
  });
}

export function getHomepageSections(
  uiConfig: OrganizationUiConfig
): UiHomepageSection[] {
  return uiConfig.homepage?.sections?.length
    ? uiConfig.homepage.sections
    : DEFAULT_HOMEPAGE_SECTIONS;
}

export function homepageSectionVisible(
  uiConfig: OrganizationUiConfig,
  section: UiHomepageSection
): boolean {
  return getHomepageSections(uiConfig).includes(section);
}

export function getHomepageLayout(
  uiConfig: OrganizationUiConfig
): "classic" | "hero-center" | "split" {
  return uiConfig.layout?.homepage || "classic";
}
