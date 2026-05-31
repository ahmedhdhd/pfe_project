/** UI customization schema — mirrors backend ui-customization.ts */

export const UI_PRESETS = [
  "default",
  "minimal",
  "bold",
  "academic",
  "futuristic",
] as const;

export const UI_FONT_FAMILIES = [
  "inter",
  "geist",
  "source-serif",
  "dm-sans",
] as const;

export const UI_RADIUS = ["none", "sm", "md", "lg", "full"] as const;
export const UI_DENSITY = ["compact", "comfortable", "spacious"] as const;
export const UI_SHADOW = ["flat", "soft", "elevated"] as const;
export const UI_SURFACE = ["solid", "muted", "glass"] as const;
export const UI_BUTTON_VARIANTS = ["default", "pill", "sharp"] as const;
export const UI_CARD_VARIANTS = ["default", "bordered", "glass", "flat"] as const;
export const UI_SIDEBAR_VARIANTS = ["light", "dark", "brand"] as const;
export const UI_HEADER_VARIANTS = ["default", "transparent", "solid"] as const;
export const UI_HOMEPAGE_LAYOUTS = ["classic", "hero-center", "split"] as const;
export const UI_ADMIN_SHELLS = ["sidebar-default", "sidebar-compact"] as const;
export const UI_STUDENT_SHELLS = ["default", "sidebar", "topnav", "minimal"] as const;
export const UI_HOMEPAGE_SECTIONS = [
  "hero",
  "features",
  "pricing",
  "testimonials",
  "faq",
  "cta",
] as const;

export type UiPreset = (typeof UI_PRESETS)[number];
export type UiHomepageSection = (typeof UI_HOMEPAGE_SECTIONS)[number];

export interface UiConfigTokens {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: (typeof UI_FONT_FAMILIES)[number];
  radius?: (typeof UI_RADIUS)[number];
  density?: (typeof UI_DENSITY)[number];
  shadow?: (typeof UI_SHADOW)[number];
  surface?: (typeof UI_SURFACE)[number];
}

export interface UiConfigVariants {
  button?: (typeof UI_BUTTON_VARIANTS)[number];
  card?: (typeof UI_CARD_VARIANTS)[number];
  sidebar?: (typeof UI_SIDEBAR_VARIANTS)[number];
  header?: (typeof UI_HEADER_VARIANTS)[number];
}

export interface UiConfigLayout {
  homepage?: (typeof UI_HOMEPAGE_LAYOUTS)[number];
  adminShell?: (typeof UI_ADMIN_SHELLS)[number];
  studentShell?: (typeof UI_STUDENT_SHELLS)[number];
}

export interface UiHomepageFeature {
  title: string;
  description: string;
  icon: string;
}

export interface UiHomepageConfig {
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  sections?: UiHomepageSection[];
  features?: UiHomepageFeature[];
  testimonials?: Array<{ name: string; message: string }>;
  faq?: Array<{ question: string; answer: string }>;
}

export interface OrganizationUiConfig {
  version: 1;
  preset?: UiPreset;
  tokens?: UiConfigTokens;
  variants?: UiConfigVariants;
  layout?: UiConfigLayout;
  homepage?: UiHomepageConfig;
}

export type UiConfigPatch = Partial<
  Omit<OrganizationUiConfig, "version"> & {
    tokens?: Partial<UiConfigTokens>;
    variants?: Partial<UiConfigVariants>;
    layout?: Partial<UiConfigLayout>;
    homepage?: Partial<UiHomepageConfig>;
  }
>;

export const DEFAULT_UI_CONFIG: OrganizationUiConfig = {
  version: 1,
  preset: "default",
  tokens: {
    primaryColor: "#3b82f6",
    secondaryColor: "#06b6d4",
    fontFamily: "inter",
    radius: "sm",
    density: "comfortable",
    shadow: "soft",
    surface: "solid",
  },
  variants: {
    button: "default",
    card: "default",
    sidebar: "light",
    header: "default",
  },
  layout: {
    homepage: "classic",
    adminShell: "sidebar-default",
    studentShell: "default",
  },
  homepage: {
    sections: ["hero", "features", "testimonials", "faq", "cta"],
  },
};

export const DEFAULT_HOMEPAGE_SECTIONS: UiHomepageSection[] = [
  "hero",
  "features",
  "testimonials",
  "faq",
  "cta",
];
