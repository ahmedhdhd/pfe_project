import type { OrganizationConfig } from "@/lib/types/api";

export interface OnboardingFeaturesEnabled {
  liveSessionsEnabled?: boolean;
  aiChatEnabled?: boolean;
  certificatesEnabled?: boolean;
  quizEnabled?: boolean;
  assignmentsEnabled?: boolean;
  catalogPublicEnabled?: boolean;
  qaModuleEnabled?: boolean;
  announcementsEnabled?: boolean;
}

export interface OnboardingPartialConfig {
  name?: string;
  language?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  themeColor?: string;
  featuresEnabled?: OnboardingFeaturesEnabled;
  audienceType?: string;
  platformType?: string;
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

export const ONBOARDING_FEATURE_LIST = [
  { key: "liveSessionsEnabled" as const, label: "Live sessions" },
  { key: "aiChatEnabled" as const, label: "AI assistant" },
  { key: "certificatesEnabled" as const, label: "Certificates" },
  { key: "quizEnabled" as const, label: "Quizzes" },
  { key: "assignmentsEnabled" as const, label: "Assignments" },
  { key: "catalogPublicEnabled" as const, label: "Public catalog" },
  { key: "qaModuleEnabled" as const, label: "Q&A module" },
  { key: "announcementsEnabled" as const, label: "Announcements" },
];

export const ONBOARDING_TOTAL_STEPS = 9;

export function mergeOnboardingPartial(
  prev: OnboardingPartialConfig,
  next: OnboardingPartialConfig
): OnboardingPartialConfig {
  return {
    ...prev,
    ...next,
    featuresEnabled: {
      ...prev.featuresEnabled,
      ...next.featuresEnabled,
    },
  };
}

export function countOnboardingProgress(partial: OnboardingPartialConfig): number {
  let n = 0;
  if (partial.name) n++;
  if (partial.platformType) n++;
  if (partial.audienceType) n++;
  if (partial.language) n++;
  if (partial.themeColor) n++;
  if (partial.featuresEnabled && Object.keys(partial.featuresEnabled).length >= 4) n++;
  if (
    partial.featuresEnabled &&
    typeof partial.featuresEnabled.catalogPublicEnabled === "boolean"
  )
    n++;
  if (partial.heroTitle) n++;
  if (partial.heroSubtitle) n++;
  return Math.min(n, ONBOARDING_TOTAL_STEPS);
}

export function onboardingToLaunchPayload(
  partial: OnboardingPartialConfig,
  organizationId: string,
  slug: string
) {
  const primary = partial.themeColor || "#6366f1";
  const secondary = deriveSecondaryColor(primary);
  const fe = partial.featuresEnabled || {};

  const featuresEnabled: Record<string, boolean> = {};
  if (typeof fe.liveSessionsEnabled === "boolean")
    featuresEnabled.liveSessions = fe.liveSessionsEnabled;
  if (typeof fe.aiChatEnabled === "boolean")
    featuresEnabled.aiTutor = fe.aiChatEnabled;
  if (typeof fe.certificatesEnabled === "boolean")
    featuresEnabled.certificates = fe.certificatesEnabled;
  if (typeof fe.quizEnabled === "boolean")
    featuresEnabled.testSeries = fe.quizEnabled;
  if (typeof fe.assignmentsEnabled === "boolean")
    featuresEnabled.assignments = fe.assignmentsEnabled;
  if (typeof fe.announcementsEnabled === "boolean")
    featuresEnabled.announcements = fe.announcementsEnabled;
  if (typeof fe.qaModuleEnabled === "boolean")
    featuresEnabled.qaModule = fe.qaModuleEnabled;
  featuresEnabled.courses = true;

  return {
    organizationId,
    name: partial.name || "My Academy",
    slug,
    themeColor: primary,
    theme: { primaryColor: primary, secondaryColor: secondary },
    language: partial.language,
    audienceType: partial.audienceType,
    platformType: partial.platformType,
    heroTitle: partial.heroTitle,
    heroSubtitle: partial.heroSubtitle,
    ctaText: "Get Started",
    ctaUrl: "/login",
    featuresEnabled,
    paymentMode: fe.catalogPublicEnabled === false ? "free" : "per_course",
    description: [
      partial.platformType,
      partial.audienceType && `for ${partial.audienceType}`,
      partial.language && `(${partial.language})`,
    ]
      .filter(Boolean)
      .join(" "),
    features: buildPreviewHomepageFeatures(partial),
  };
}

function deriveSecondaryColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#ec4899";
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + 30);
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + 20);
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + 40);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function buildPreviewHomepageFeatures(partial: OnboardingPartialConfig) {
  const fe = partial.featuresEnabled || {};
  const audience = partial.audienceType || "learners";
  const items: Array<{ title: string; description: string; icon: string }> = [];

  if (fe.liveSessionsEnabled !== false) {
    items.push({
      title: "Live sessions",
      description: `Interactive classes and workshops for ${audience}.`,
      icon: "calendar",
    });
  }
  if (fe.aiChatEnabled === true) {
    items.push({
      title: "AI learning assistant",
      description: "Instant help while studying course material.",
      icon: "brain",
    });
  }
  if (fe.quizEnabled !== false) {
    items.push({
      title: "Quizzes & assessments",
      description: "Measure progress with structured tests.",
      icon: "award",
    });
  }
  if (fe.assignmentsEnabled !== false) {
    items.push({
      title: "Assignments",
      description: "Practice tasks with teacher feedback.",
      icon: "file",
    });
  }
  if (fe.certificatesEnabled !== false) {
    items.push({
      title: "Certificates",
      description: "Recognize achievements when courses are completed.",
      icon: "award",
    });
  }
  if (fe.catalogPublicEnabled !== false) {
    items.push({
      title: "Public course catalog",
      description: "Browse and enroll in published courses online.",
      icon: "book",
    });
  }

  return items.slice(0, 6);
}

/** Build a full OrganizationConfig for live iframe preview */
export function buildOnboardingPreviewConfig(
  partial: OnboardingPartialConfig,
  options: {
    organizationId: string;
    slug: string;
    base?: OrganizationConfig | null;
  }
): OrganizationConfig {
  const payload = onboardingToLaunchPayload(
    partial,
    options.organizationId,
    options.slug
  );
  const base = options.base;

  return {
    id: base?.id || options.organizationId,
    organizationId: options.organizationId,
    slug: options.slug,
    name: partial.name || base?.name || "Your Academy",
    domain: base?.domain,
    logoUrl: base?.logoUrl,
    faviconUrl: base?.faviconUrl,
    bannerUrls: base?.bannerUrls,
    motto: partial.platformType || base?.motto,
    description: payload.description || base?.description,
    theme: payload.theme,
    heroTitle:
      partial.heroTitle ||
      base?.heroTitle ||
      `Welcome to ${partial.name || base?.name || "Your Academy"}`,
    heroSubtitle:
      partial.heroSubtitle ||
      base?.heroSubtitle ||
      (partial.audienceType
        ? `Learning built for ${partial.audienceType}`
        : undefined),
    ctaText: payload.ctaText,
    ctaUrl: payload.ctaUrl,
    features:
      (payload.features && payload.features.length > 0
        ? payload.features
        : base?.features) || [],
    testimonials: base?.testimonials || [],
    faq: base?.faq || [],
    socialLinks: base?.socialLinks,
    metaTitle: partial.name || base?.metaTitle,
    metaDescription: payload.description || base?.metaDescription,
    featuresEnabled: payload.featuresEnabled,
    paymentMode: payload.paymentMode as OrganizationConfig["paymentMode"],
    currency: base?.currency || "TND",
    maintenanceMode: false,
    customCSS: base?.customCSS,
    // Never inject third-party chat/widgets into onboarding iframe preview
    customJS: undefined,
  };
}
