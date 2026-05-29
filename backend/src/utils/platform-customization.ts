/**
 * Platform customization via LLM — allowlisted patch validation & merge.
 */

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_CSS_LENGTH = 12_000;

export const PLATFORM_FEATURE_KEYS = [
  'courses',
  'categories',
  'users',
  'teachers',
  'announcements',
  'orders',
  'liveSessions',
  'assignments',
  'certificates',
  'testSeries',
  'aiTutor',
  'qaModule',
] as const;

export type PlatformFeatureKey = (typeof PLATFORM_FEATURE_KEYS)[number];

const DENYLIST_PATCH_KEYS = new Set([
  'id',
  'organizationId',
  'createdAt',
  'updatedAt',
  'openRouterApiKey',
  'razorpayKeyId',
  'razorpayKeySecret',
  'konnectApiKey',
  'konnectWalletId',
  'paymeeApiToken',
  'paymeeVendor',
  'smtpConfig',
  'smtpConfigJson',
  'customJS',
  'themeJson',
  'featuresJson',
  'testimonialsJson',
  'faqJson',
  'socialLinksJson',
]);

const ALLOWED_PATCH_KEYS = new Set([
  'name',
  'motto',
  'description',
  'theme',
  'heroTitle',
  'heroSubtitle',
  'ctaText',
  'ctaUrl',
  'features',
  'testimonials',
  'faq',
  'socialLinks',
  'metaTitle',
  'metaDescription',
  'featuresEnabled',
  'customCSS',
  'maintenanceMode',
]);

export function extractJsonObject(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function optionalString(value: unknown, maxLen: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  return s.slice(0, maxLen);
}

function normalizeHexColor(value: unknown): string | undefined {
  const s = optionalString(value, 32);
  if (!s) return undefined;
  if (!HEX_COLOR.test(s)) return undefined;
  return s;
}

function normalizeTheme(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const theme: Record<string, string> = {};
  const primary = normalizeHexColor(o.primaryColor);
  const secondary = normalizeHexColor(o.secondaryColor);
  const fontFamily = optionalString(o.fontFamily, 200);
  if (primary) theme.primaryColor = primary;
  if (secondary) theme.secondaryColor = secondary;
  if (fontFamily) theme.fontFamily = fontFamily;
  return Object.keys(theme).length > 0 ? theme : undefined;
}

function normalizeFeatures(raw: unknown): Array<{ title: string; description: string; icon?: string }> | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .slice(0, 8)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const title = optionalString(o.title, 120);
      const description = optionalString(o.description, 500);
      if (!title || !description) return null;
      const icon = optionalString(o.icon, 40);
      return { title, description, ...(icon ? { icon } : {}) };
    })
    .filter(Boolean) as Array<{ title: string; description: string; icon?: string }>;
  return items.length > 0 ? items : undefined;
}

function normalizeTestimonials(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .slice(0, 6)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const name = optionalString(o.name, 80);
      const message = optionalString(o.message, 600);
      if (!name || !message) return null;
      const avatar = optionalString(o.avatar, 500);
      return { name, message, ...(avatar ? { avatar } : {}) };
    })
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function normalizeFaq(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .slice(0, 12)
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const question = optionalString(o.question, 200);
      const answer = optionalString(o.answer, 1200);
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function normalizeSocialLinks(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = optionalString(k, 40);
    const val = optionalString(v, 500);
    if (key && val) out[key] = val;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeFeaturesEnabled(raw: unknown): Record<string, boolean> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, boolean> = {};
  for (const key of PLATFORM_FEATURE_KEYS) {
    if (key in (raw as Record<string, unknown>)) {
      out[key] = Boolean((raw as Record<string, unknown>)[key]);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function sanitizeCustomCss(css: unknown): string | undefined {
  const s = optionalString(css, MAX_CSS_LENGTH);
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (lower.includes('@import') || lower.includes('javascript:') || lower.includes('expression(')) {
    return undefined;
  }
  return s;
}

/** Strip and validate LLM `patch` object. */
export function sanitizePlatformPatch(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid patch: expected object');
  }
  const input = raw as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  for (const key of Object.keys(input)) {
    if (DENYLIST_PATCH_KEYS.has(key)) continue;
    if (!ALLOWED_PATCH_KEYS.has(key)) continue;
    patch[key] = input[key];
  }

  const out: Record<string, unknown> = {};

  const name = optionalString(patch.name, 120);
  if (name) out.name = name;
  const motto = optionalString(patch.motto, 200);
  if (motto) out.motto = motto;
  const description = optionalString(patch.description, 2000);
  if (description) out.description = description;

  const theme = normalizeTheme(patch.theme);
  if (theme) out.theme = theme;

  const heroTitle = optionalString(patch.heroTitle, 200);
  if (heroTitle) out.heroTitle = heroTitle;
  const heroSubtitle = optionalString(patch.heroSubtitle, 400);
  if (heroSubtitle) out.heroSubtitle = heroSubtitle;
  const ctaText = optionalString(patch.ctaText, 80);
  if (ctaText) out.ctaText = ctaText;
  const ctaUrl = optionalString(patch.ctaUrl, 500);
  if (ctaUrl) out.ctaUrl = ctaUrl;

  const features = normalizeFeatures(patch.features);
  if (features) out.features = features;
  const testimonials = normalizeTestimonials(patch.testimonials);
  if (testimonials) out.testimonials = testimonials;
  const faq = normalizeFaq(patch.faq);
  if (faq) out.faq = faq;
  const socialLinks = normalizeSocialLinks(patch.socialLinks);
  if (socialLinks) out.socialLinks = socialLinks;

  const metaTitle = optionalString(patch.metaTitle, 120);
  if (metaTitle) out.metaTitle = metaTitle;
  const metaDescription = optionalString(patch.metaDescription, 320);
  if (metaDescription) out.metaDescription = metaDescription;

  const featuresEnabled = normalizeFeaturesEnabled(patch.featuresEnabled);
  if (featuresEnabled) out.featuresEnabled = featuresEnabled;

  const customCSS = sanitizeCustomCss(patch.customCSS);
  if (customCSS) out.customCSS = customCSS;

  if (typeof patch.maintenanceMode === 'boolean') {
    out.maintenanceMode = patch.maintenanceMode;
  }

  if (Object.keys(out).length === 0) {
    throw new Error('Patch contained no valid allowed fields');
  }

  return out;
}

export function mergePlatformPatch(
  current: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (key === 'theme' && value && typeof value === 'object') {
      merged.theme = {
        ...((merged.theme as Record<string, unknown>) || {}),
        ...(value as Record<string, unknown>),
      };
      continue;
    }
    if (key === 'featuresEnabled' && value && typeof value === 'object') {
      merged.featuresEnabled = {
        ...((merged.featuresEnabled as Record<string, unknown>) || {}),
        ...(value as Record<string, unknown>),
      };
      continue;
    }
    if (key === 'socialLinks' && value && typeof value === 'object') {
      merged.socialLinks = {
        ...((merged.socialLinks as Record<string, unknown>) || {}),
        ...(value as Record<string, unknown>),
      };
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

export function buildPlatformCustomizationSystemPrompt(): string {
  return `You are a white-label LMS platform designer. Given the admin's description and current organization config, output JSON only.

Response shape:
{
  "summary": "1-3 sentences explaining what you changed",
  "patch": { /* only fields that should change */ },
  "warnings": ["optional notes"]
}

Allowed patch keys only:
- name, motto, description
- theme: { primaryColor, secondaryColor, fontFamily } (hex colors like #6366f1)
- heroTitle, heroSubtitle, ctaText, ctaUrl
- features: [{ title, description, icon? }] max 8
- testimonials: [{ name, message, avatar? }] max 6
- faq: [{ question, answer }] max 12
- socialLinks: { platform: url }
- metaTitle, metaDescription
- featuresEnabled: { courses, categories, users, teachers, announcements, orders, liveSessions, assignments, certificates, testSeries, aiTutor, qaModule } (booleans)
- customCSS (safe CSS only, no @import)
- maintenanceMode (boolean)

Never include: payment keys, API keys, SMTP, customJS, slug, organizationId.

If the request is vague, make reasonable defaults aligned with the industry they mention.
Keep copy professional and concise.`;
}

export function summarizePatchDiff(
  before: Record<string, unknown>,
  patch: Record<string, unknown>
): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(patch)) {
    const prev = before[key];
    const next = patch[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      lines.push(key);
    }
  }
  return lines;
}
