/**
 * UI-only customization — validated patches for design tokens, variants, and homepage.
 */

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const UI_PRESETS = [
  'default',
  'minimal',
  'bold',
  'academic',
  'futuristic',
] as const;

export const UI_FONT_FAMILIES = ['inter', 'geist', 'source-serif', 'dm-sans'] as const;
export const UI_RADIUS = ['none', 'sm', 'md', 'lg', 'full'] as const;
export const UI_DENSITY = ['compact', 'comfortable', 'spacious'] as const;
export const UI_SHADOW = ['flat', 'soft', 'elevated'] as const;
export const UI_SURFACE = ['solid', 'muted', 'glass'] as const;
export const UI_BUTTON_VARIANTS = ['default', 'pill', 'sharp'] as const;
export const UI_CARD_VARIANTS = ['default', 'bordered', 'glass', 'flat'] as const;
export const UI_SIDEBAR_VARIANTS = ['light', 'dark', 'brand'] as const;
export const UI_HEADER_VARIANTS = ['default', 'transparent', 'solid'] as const;
export const UI_HOMEPAGE_LAYOUTS = ['classic', 'hero-center', 'split'] as const;
export const UI_ADMIN_SHELLS = ['sidebar-default', 'sidebar-compact'] as const;
export const UI_STUDENT_SHELLS = ['default', 'sidebar', 'topnav', 'minimal'] as const;
export const UI_HOMEPAGE_SECTIONS = [
  'hero',
  'features',
  'pricing',
  'testimonials',
  'faq',
  'cta',
] as const;

export const UI_FEATURE_ICONS = [
  'brain',
  'book',
  'calendar',
  'award',
  'file',
  'users',
  'graduation-cap',
] as const;

type Enum<T extends readonly string[]> = T[number];

export interface UiConfigTokens {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: Enum<typeof UI_FONT_FAMILIES>;
  radius?: Enum<typeof UI_RADIUS>;
  density?: Enum<typeof UI_DENSITY>;
  shadow?: Enum<typeof UI_SHADOW>;
  surface?: Enum<typeof UI_SURFACE>;
}

export interface UiConfigVariants {
  button?: Enum<typeof UI_BUTTON_VARIANTS>;
  card?: Enum<typeof UI_CARD_VARIANTS>;
  sidebar?: Enum<typeof UI_SIDEBAR_VARIANTS>;
  header?: Enum<typeof UI_HEADER_VARIANTS>;
}

export interface UiConfigLayout {
  homepage?: Enum<typeof UI_HOMEPAGE_LAYOUTS>;
  adminShell?: Enum<typeof UI_ADMIN_SHELLS>;
  studentShell?: Enum<typeof UI_STUDENT_SHELLS>;
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
  sections?: Enum<typeof UI_HOMEPAGE_SECTIONS>[];
  features?: UiHomepageFeature[];
  testimonials?: Array<{ name: string; message: string }>;
  faq?: Array<{ question: string; answer: string }>;
}

export interface OrganizationUiConfig {
  version: 1;
  preset?: Enum<typeof UI_PRESETS>;
  tokens?: UiConfigTokens;
  variants?: UiConfigVariants;
  layout?: UiConfigLayout;
  homepage?: UiHomepageConfig;
}

export type UiConfigPatch = Partial<
  Omit<OrganizationUiConfig, 'version'> & {
    tokens?: Partial<UiConfigTokens>;
    variants?: Partial<UiConfigVariants>;
    layout?: Partial<UiConfigLayout>;
    homepage?: Partial<UiHomepageConfig>;
  }
>;

function pickEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T
): Enum<T> | undefined {
  if (typeof value !== 'string') return undefined;
  return (allowed as readonly string[]).includes(value)
    ? (value as Enum<T>)
    : undefined;
}

function optionalString(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s ? s.slice(0, max) : undefined;
}

function normalizeHex(value: unknown): string | undefined {
  const s = optionalString(value, 32);
  if (!s || !HEX_COLOR.test(s)) return undefined;
  return s;
}

function sanitizeHomepageFeature(raw: unknown): UiHomepageFeature | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const title = optionalString(o.title, 120);
  const description = optionalString(o.description, 400);
  if (!title || !description) return null;
  const icon = pickEnum(o.icon, UI_FEATURE_ICONS) ?? 'brain';
  return { title, description, icon };
}

function sanitizeHomepage(raw: unknown): UiHomepageConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const out: UiHomepageConfig = {};

  const heroTitle = optionalString(o.heroTitle, 200);
  const heroSubtitle = optionalString(o.heroSubtitle, 400);
  const ctaText = optionalString(o.ctaText, 80);
  const ctaUrl = optionalString(o.ctaUrl, 200);
  if (heroTitle) out.heroTitle = heroTitle;
  if (heroSubtitle) out.heroSubtitle = heroSubtitle;
  if (ctaText) out.ctaText = ctaText;
  if (ctaUrl) out.ctaUrl = ctaUrl;

  if (Array.isArray(o.sections)) {
    const sections = o.sections
      .map((s) => pickEnum(s, UI_HOMEPAGE_SECTIONS))
      .filter(Boolean) as UiHomepageConfig['sections'];
    if (sections.length) out.sections = sections;
  }

  if (Array.isArray(o.features)) {
    const features = o.features
      .map(sanitizeHomepageFeature)
      .filter(Boolean)
      .slice(0, 8) as UiHomepageFeature[];
    if (features.length) out.features = features;
  }

  if (Array.isArray(o.testimonials)) {
    const testimonials = o.testimonials
      .filter((t) => t && typeof t === 'object')
      .map((t) => {
        const item = t as Record<string, unknown>;
        const name = optionalString(item.name, 80);
        const message = optionalString(item.message, 500);
        return name && message ? { name, message } : null;
      })
      .filter(Boolean)
      .slice(0, 6) as UiHomepageConfig['testimonials'];
    if (testimonials?.length) out.testimonials = testimonials;
  }

  if (Array.isArray(o.faq)) {
    const faq = o.faq
      .filter((f) => f && typeof f === 'object')
      .map((f) => {
        const item = f as Record<string, unknown>;
        const question = optionalString(item.question, 200);
        const answer = optionalString(item.answer, 800);
        return question && answer ? { question, answer } : null;
      })
      .filter(Boolean)
      .slice(0, 12) as UiHomepageConfig['faq'];
    if (faq?.length) out.faq = faq;
  }

  return Object.keys(out).length ? out : undefined;
}

export function sanitizeUiConfigPatch(raw: unknown): UiConfigPatch {
  if (!raw || typeof raw !== 'object') {
    throw new Error('UI patch must be a JSON object');
  }
  const o = raw as Record<string, unknown>;
  const patch: UiConfigPatch = {};

  const preset = pickEnum(o.preset, UI_PRESETS);
  if (preset) patch.preset = preset;

  if (o.tokens && typeof o.tokens === 'object') {
    const t = o.tokens as Record<string, unknown>;
    const tokens: UiConfigTokens = {};
    const primaryColor = normalizeHex(t.primaryColor);
    const secondaryColor = normalizeHex(t.secondaryColor);
    if (primaryColor) tokens.primaryColor = primaryColor;
    if (secondaryColor) tokens.secondaryColor = secondaryColor;
    const fontFamily = pickEnum(t.fontFamily, UI_FONT_FAMILIES);
    const radius = pickEnum(t.radius, UI_RADIUS);
    const density = pickEnum(t.density, UI_DENSITY);
    const shadow = pickEnum(t.shadow, UI_SHADOW);
    const surface = pickEnum(t.surface, UI_SURFACE);
    if (fontFamily) tokens.fontFamily = fontFamily;
    if (radius) tokens.radius = radius;
    if (density) tokens.density = density;
    if (shadow) tokens.shadow = shadow;
    if (surface) tokens.surface = surface;
    if (Object.keys(tokens).length) patch.tokens = tokens;
  }

  if (o.variants && typeof o.variants === 'object') {
    const v = o.variants as Record<string, unknown>;
    const variants: UiConfigVariants = {};
    const button = pickEnum(v.button, UI_BUTTON_VARIANTS);
    const card = pickEnum(v.card, UI_CARD_VARIANTS);
    const sidebar = pickEnum(v.sidebar, UI_SIDEBAR_VARIANTS);
    const header = pickEnum(v.header, UI_HEADER_VARIANTS);
    if (button) variants.button = button;
    if (card) variants.card = card;
    if (sidebar) variants.sidebar = sidebar;
    if (header) variants.header = header;
    if (Object.keys(variants).length) patch.variants = variants;
  }

  if (o.layout && typeof o.layout === 'object') {
    const l = o.layout as Record<string, unknown>;
    const layout: UiConfigLayout = {};
    const homepage = pickEnum(l.homepage, UI_HOMEPAGE_LAYOUTS);
    const adminShell = pickEnum(l.adminShell, UI_ADMIN_SHELLS);
    const studentShell = pickEnum(l.studentShell, UI_STUDENT_SHELLS);
    if (homepage) layout.homepage = homepage;
    if (adminShell) layout.adminShell = adminShell;
    if (studentShell) layout.studentShell = studentShell;
    if (Object.keys(layout).length) patch.layout = layout;
  }

  const homepage = sanitizeHomepage(o.homepage);
  if (homepage) patch.homepage = homepage;

  if (!Object.keys(patch).length) {
    throw new Error('UI patch contained no valid fields');
  }

  return patch;
}

export function mergeUiConfig(
  base: OrganizationUiConfig | null | undefined,
  patch: UiConfigPatch
): OrganizationUiConfig {
  const current: OrganizationUiConfig =
    base?.version === 1 ? { ...base } : { version: 1 };

  if (patch.preset) current.preset = patch.preset;
  if (patch.tokens) current.tokens = { ...current.tokens, ...patch.tokens };
  if (patch.variants) current.variants = { ...current.variants, ...patch.variants };
  if (patch.layout) current.layout = { ...current.layout, ...patch.layout };
  if (patch.homepage) {
    current.homepage = { ...current.homepage, ...patch.homepage };
    if (patch.homepage.features) current.homepage.features = patch.homepage.features;
    if (patch.homepage.sections) current.homepage.sections = patch.homepage.sections;
    if (patch.homepage.testimonials)
      current.homepage.testimonials = patch.homepage.testimonials;
    if (patch.homepage.faq) current.homepage.faq = patch.homepage.faq;
  }

  return { ...current, version: 1 };
}

export function uiConfigToLegacyFields(ui: OrganizationUiConfig): Record<string, unknown> {
  const out: Record<string, unknown> = { uiConfigJson: ui };
  const tokens = ui.tokens || {};
  const homepage = ui.homepage || {};

  if (tokens.primaryColor || tokens.secondaryColor || tokens.fontFamily) {
    const theme: Record<string, string> = {};
    if (tokens.primaryColor) theme.primaryColor = tokens.primaryColor;
    if (tokens.secondaryColor) theme.secondaryColor = tokens.secondaryColor;
    if (tokens.fontFamily) {
      const fontMap: Record<string, string> = {
        inter: 'Inter, sans-serif',
        geist: 'var(--font-geist-sans), sans-serif',
        'source-serif': 'Source Serif 4, serif',
        'dm-sans': 'DM Sans, sans-serif',
      };
      theme.fontFamily = fontMap[tokens.fontFamily] || fontMap.inter;
    }
    out.themeJson = theme;
    if (tokens.primaryColor) out.themeColor = tokens.primaryColor;
  }

  if (homepage.heroTitle) out.heroTitle = homepage.heroTitle;
  if (homepage.heroSubtitle) out.heroSubtitle = homepage.heroSubtitle;
  if (homepage.ctaText) out.ctaText = homepage.ctaText;
  if (homepage.ctaUrl) out.ctaUrl = homepage.ctaUrl;
  if (homepage.features?.length) out.featuresJson = homepage.features;
  if (homepage.testimonials?.length) {
    out.testimonialsJson = homepage.testimonials.map((t) => ({
      name: t.name,
      message: t.message,
    }));
  }
  if (homepage.faq?.length) out.faqJson = homepage.faq;

  return out;
}

export function summarizeUiPatchDiff(
  before: OrganizationUiConfig | null | undefined,
  after: OrganizationUiConfig
): string[] {
  const fields: string[] = [];
  if (before?.preset !== after.preset && after.preset) fields.push('preset');
  if (JSON.stringify(before?.tokens) !== JSON.stringify(after.tokens)) fields.push('tokens');
  if (JSON.stringify(before?.variants) !== JSON.stringify(after.variants))
    fields.push('variants');
  if (JSON.stringify(before?.layout) !== JSON.stringify(after.layout)) fields.push('layout');
  if (JSON.stringify(before?.homepage) !== JSON.stringify(after.homepage))
    fields.push('homepage');
  return fields;
}

export function buildUiCustomizationSystemPrompt(): string {
  return `You are a UI theme assistant for Tesla Academy (QueztLearn LMS).
Suggest LOOK AND FEEL changes only — colors, typography, spacing feel, component styles, homepage copy/sections, layout modes.

Do NOT change feature flags, payment, API keys, custom CSS/JS, or business logic.

Return JSON only:
{
  "summary": "short summary",
  "patch": {
    "preset": "default|minimal|bold|academic|futuristic",
    "tokens": { "primaryColor": "#hex", "secondaryColor": "#hex", "fontFamily": "inter|geist|source-serif|dm-sans", "radius": "none|sm|md|lg|full", "density": "compact|comfortable|spacious", "shadow": "flat|soft|elevated", "surface": "solid|muted|glass" },
    "variants": { "button": "default|pill|sharp", "card": "default|bordered|glass|flat", "sidebar": "light|dark|brand", "header": "default|transparent|solid" },
    "layout": { "homepage": "classic|hero-center|split", "adminShell": "sidebar-default|sidebar-compact" },
    "homepage": { "heroTitle": "...", "heroSubtitle": "...", "ctaText": "Get Started", "ctaUrl": "/login", "sections": ["hero","features","testimonials","faq","cta"], "features": [{ "title": "...", "description": "...", "icon": "brain|book|calendar|award|file|users|graduation-cap" }] }
  },
  "warnings": []
}

Include only fields that should change. Use valid hex colors.`;
}

export function extractJsonObject(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || text;
    const match = candidate.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

export const PRESET_DEFAULTS: Record<string, UiConfigPatch> = {
  default: {},
  minimal: {
    preset: 'minimal',
    tokens: { radius: 'sm', shadow: 'flat', surface: 'solid', density: 'compact' },
    variants: { button: 'sharp', card: 'flat', sidebar: 'light' },
    layout: { homepage: 'classic' },
  },
  bold: {
    preset: 'bold',
    tokens: { radius: 'md', shadow: 'elevated', surface: 'solid', density: 'comfortable' },
    variants: { button: 'default', card: 'bordered', sidebar: 'brand' },
    layout: { homepage: 'split' },
  },
  academic: {
    preset: 'academic',
    tokens: {
      primaryColor: '#1e3a5f',
      secondaryColor: '#c9a227',
      fontFamily: 'source-serif',
      radius: 'sm',
      shadow: 'soft',
      surface: 'muted',
      density: 'comfortable',
    },
    variants: { button: 'default', card: 'bordered', sidebar: 'dark' },
    layout: { homepage: 'classic' },
  },
  futuristic: {
    preset: 'futuristic',
    tokens: {
      primaryColor: '#2563eb',
      radius: 'lg',
      shadow: 'elevated',
      surface: 'glass',
      density: 'comfortable',
    },
    variants: { button: 'pill', card: 'glass', sidebar: 'dark', header: 'transparent' },
    layout: { homepage: 'hero-center' },
  },
};

export function resolveUiConfigFromPreset(
  base: OrganizationUiConfig | null | undefined,
  patch: UiConfigPatch
): OrganizationUiConfig {
  let merged: OrganizationUiConfig =
    base?.version === 1 ? { ...base } : { version: 1 };
  const presetName = patch.preset;
  if (presetName && PRESET_DEFAULTS[presetName]) {
    merged = mergeUiConfig(merged, PRESET_DEFAULTS[presetName]);
  }
  return mergeUiConfig(merged, patch);
}
