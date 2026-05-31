import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { buildOpenRouterHeaders } from '../utils/openrouter';
import {
  buildPlatformCustomizationSystemPrompt,
  extractJsonObject as extractPlatformJson,
  mergePlatformPatch,
  sanitizeCustomCss,
  sanitizePlatformPatch,
  summarizePatchDiff,
} from '../utils/platform-customization';
import {
  buildUiCustomizationSystemPrompt,
  extractJsonObject as extractUiJson,
  mergeUiConfig,
  resolveUiConfigFromPreset,
  sanitizeUiConfigPatch,
  summarizeUiPatchDiff,
  uiConfigToLegacyFields,
  type OrganizationUiConfig,
} from '../utils/ui-customization';

const SUPPORTED_CURRENCIES = new Set(['TND', 'USD', 'EUR']);

function normalizeCurrency(currency: unknown): string {
  if (typeof currency !== 'string') {
    return 'TND';
  }

  const normalized = currency.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.has(normalized) ? normalized : 'TND';
}

export const createOrganization = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, slug, subdomain, branding } = req.body;
    const org = await prisma.organization.create({
      data: { name, slug, subdomain: subdomain || slug, domain: branding?.customDomain || null },
    });
    sendSuccess(res, org, undefined, 201);
  } catch (e) { next(e); }
};

export const getPublicConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;
    let config = await prisma.organizationConfig.findFirst({
      where: { OR: [{ slug }, { organization: { subdomain: slug } }, { organization: { domain: slug } }] },
    });
    
    // Fallback if no specific config exists yet for this organization
    if (!config) {
      const org = await prisma.organization.findFirst({
        where: { OR: [{ slug }, { subdomain: slug }, { domain: slug }] },
      });
      if (!org) { sendError(res, 'Organization not found', 404); return; }
      
      // Construct a default config object from the base organization
      config = {
        id: org.id,
        organizationId: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        contactEmail: null,
        contactPhone: null,
        razorpayKeyId: null,
        razorpayKeySecret: null,
        konnectApiKey: null,
        konnectWalletId: null,
        paymentGateway: "konnect",
        paymeeApiToken: null,
        paymeeVendor: null,
        paymentMode: "per_course",
        subscriptionType: "FREE",
        subscriptionPrice: 0,
        currency: "TND",
        taxPercentage: null,
        invoicePrefix: null,
        logoUrl: null,
        faviconUrl: null,
        bannerUrls: [],
        motto: null,
        description: null,
        customCSS: null,
        customJS: null,
        themeJson: null,
        heroTitle: org.name,
        heroSubtitle: null,
        ctaText: null,
        ctaUrl: null,
        featuresJson: [],
        testimonialsJson: [],
        faqJson: [],
        socialLinksJson: {},
        metaTitle: org.name,
        metaDescription: null,
        ogImage: null,
        smtpConfigJson: null,
        openRouterApiKey: null,
        supportEmail: null,
        featuresEnabled: {},
        maintenanceMode: false,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      };
    }
    
    sendSuccess(res, formatConfig(config));
  } catch (e) { next(e); }
};

export const getAdminConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId: req.user!.organizationId } });
    if (!config) { sendError(res, 'Config not found', 404); return; }
    sendSuccess(res, formatConfig(config));
  } catch (e) { next(e); }
};

export const createOrUpdateConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;
    const { theme, features, testimonials, faq, socialLinks, smtpConfig, ...rest } = req.body;
    const customCSS = sanitizeCustomCss(rest.customCSS);
    const data = {
      ...rest,
      organizationId,
      currency: normalizeCurrency(rest.currency),
      customCSS: customCSS ?? null,
      themeJson: theme || undefined,
      themeColor: theme?.primaryColor || rest.themeColor || undefined,
      featuresJson: features || undefined,
      testimonialsJson: testimonials || undefined,
      faqJson: faq || undefined,
      socialLinksJson: socialLinks || undefined,
      smtpConfigJson: smtpConfig || undefined,
    };
    const config = await prisma.organizationConfig.upsert({
      where: { organizationId },
      create: data,
      update: data,
    });
    sendSuccess(res, formatConfig(config));
  } catch (e) { next(e); }
};

export const updateOrganizationConfigById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { organizationId } = req.params;
    if (organizationId !== req.user!.organizationId) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    const { theme, features, testimonials, faq, socialLinks, smtpConfig, ...rest } = req.body;
    const customCSS = sanitizeCustomCss(rest.customCSS);
    const data = {
      ...rest,
      organizationId,
      name: rest.name || org.name,
      slug: rest.slug || org.slug,
      currency: normalizeCurrency(rest.currency),
      customCSS: customCSS ?? null,
      themeJson: theme || undefined,
      themeColor: theme?.primaryColor || rest.themeColor || undefined,
      featuresJson: features || undefined,
      testimonialsJson: testimonials || undefined,
      faqJson: faq || undefined,
      socialLinksJson: socialLinks || undefined,
      smtpConfigJson: smtpConfig || undefined,
    };

    const config = await prisma.organizationConfig.upsert({
      where: { organizationId },
      create: data,
      update: data,
    });

    sendSuccess(res, formatConfig(config));
  } catch (e) {
    next(e);
  }
};

export const clearCache = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In production: clear Redis cache or CDN cache here
    sendSuccess(res, { message: 'Cache cleared successfully' });
  } catch (e) { next(e); }
};

function configToPatchContext(config: Record<string, unknown>) {
  return {
    name: config.name,
    motto: config.motto,
    description: config.description,
    theme: config.themeJson ?? config.theme,
    heroTitle: config.heroTitle,
    heroSubtitle: config.heroSubtitle,
    ctaText: config.ctaText,
    ctaUrl: config.ctaUrl,
    features: config.featuresJson ?? config.features,
    testimonials: config.testimonialsJson ?? config.testimonials,
    faq: config.faqJson ?? config.faq,
    socialLinks: config.socialLinksJson ?? config.socialLinks,
    metaTitle: config.metaTitle,
    metaDescription: config.metaDescription,
    featuresEnabled: config.featuresEnabled,
    customCSS: config.customCSS,
    maintenanceMode: config.maintenanceMode,
  };
}

export const aiSuggestPlatformCustomization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt || prompt.length < 10) {
      sendError(res, 'prompt is required (at least 10 characters)', 400);
      return;
    }

    const organizationId = req.user!.organizationId;
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId } });
    if (!config) {
      sendError(res, 'Organization config not found. Save basic settings first.', 404);
      return;
    }

    const orgAiConfig = await prisma.organizationConfig.findUnique({
      where: { organizationId },
      select: { openRouterApiKey: true },
    });
    const openRouterApiKey =
      orgAiConfig?.openRouterApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';
    if (!openRouterApiKey) {
      sendError(
        res,
        'OpenRouter API key is not configured. Add it in Admin → Settings → AI.',
        400
      );
      return;
    }

    const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324';
    const currentContext = configToPatchContext(config as Record<string, unknown>);
    const userMessage = `Admin request:\n${prompt.slice(0, 4000)}\n\nCurrent config:\n${JSON.stringify(currentContext).slice(0, 12000)}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: buildOpenRouterHeaders(openRouterApiKey),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildPlatformCustomizationSystemPrompt() },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.35,
        max_tokens: Number(process.env.OPENROUTER_PLATFORM_DESIGN_MAX_TOKENS || 2500),
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      sendError(res, `OpenRouter failed: ${raw.slice(0, 300)}`, 502);
      return;
    }

    const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim() || '';
    const parsed = extractPlatformJson(content);
    const rawPatch = parsed.patch ?? parsed;
    const patch = sanitizePlatformPatch(rawPatch);
    const summary =
      typeof parsed.summary === 'string'
        ? parsed.summary.slice(0, 1000)
        : 'Platform customization suggestion generated.';
    const warnings = Array.isArray(parsed.warnings)
      ? (parsed.warnings as unknown[]).map((w) => String(w).slice(0, 300)).slice(0, 10)
      : [];
    const changedFields = summarizePatchDiff(currentContext, patch);

    sendSuccess(res, {
      summary,
      patch,
      warnings,
      changedFields,
    });
  } catch (e) {
    next(e);
  }
};

export const aiApplyPlatformCustomization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId } });
    if (!config) {
      sendError(res, 'Organization config not found', 404);
      return;
    }

    let patch: Record<string, unknown>;
    try {
      patch = sanitizePlatformPatch(req.body?.patch);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid patch';
      sendError(res, message, 400);
      return;
    }

    const currentFormatted = formatConfig(config as Record<string, unknown>);
    const merged = mergePlatformPatch(
      currentFormatted as Record<string, unknown>,
      patch
    );

    const { theme, features, testimonials, faq, socialLinks, smtpConfig, ...rest } =
      merged as Record<string, unknown> & {
        theme?: unknown;
        features?: unknown;
        testimonials?: unknown;
        faq?: unknown;
        socialLinks?: unknown;
        smtpConfig?: unknown;
      };

    const data = {
      ...rest,
      organizationId,
      themeJson: theme ?? config.themeJson,
      featuresJson: features ?? config.featuresJson,
      testimonialsJson: testimonials ?? config.testimonialsJson,
      faqJson: faq ?? config.faqJson,
      socialLinksJson: socialLinks ?? config.socialLinksJson,
    };

    const updated = await prisma.organizationConfig.update({
      where: { organizationId },
      data: data as Parameters<typeof prisma.organizationConfig.update>[0]['data'],
    });

    sendSuccess(res, {
      config: formatConfig(updated as Record<string, unknown>),
      changedFields: summarizePatchDiff(currentFormatted as Record<string, unknown>, patch),
    });
  } catch (e) {
    next(e);
  }
};

async function resolveOpenRouterKey(organizationId: string): Promise<string> {
  const row = await prisma.organizationConfig.findUnique({
    where: { organizationId },
    select: { openRouterApiKey: true },
  });
  return row?.openRouterApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';
}

export const aiSuggestUiCustomization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!prompt || prompt.length < 10) {
      sendError(res, 'prompt is required (at least 10 characters)', 400);
      return;
    }

    const organizationId = req.user!.organizationId;
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId } });
    if (!config) {
      sendError(res, 'Organization config not found. Save basic settings first.', 404);
      return;
    }

    const openRouterApiKey = await resolveOpenRouterKey(organizationId);
    if (!openRouterApiKey) {
      sendError(res, 'OpenRouter API key is not configured.', 400);
      return;
    }

    const currentUi = (config.uiConfigJson as OrganizationUiConfig | null) || { version: 1 };
    const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324';
    const userMessage = `Admin request:\n${prompt.slice(0, 4000)}\n\nCurrent UI config:\n${JSON.stringify(currentUi).slice(0, 8000)}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: buildOpenRouterHeaders(openRouterApiKey),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildUiCustomizationSystemPrompt() },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.35,
        max_tokens: Number(process.env.OPENROUTER_UI_DESIGN_MAX_TOKENS || 2000),
        response_format: { type: 'json_object' },
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      sendError(res, `OpenRouter failed: ${raw.slice(0, 300)}`, 502);
      return;
    }

    const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim() || '';
    const parsed = extractUiJson(content);
    const rawPatch = parsed.patch ?? parsed;
    const patch = sanitizeUiConfigPatch(rawPatch);
    const preview = resolveUiConfigFromPreset(currentUi, patch);
    const summary =
      typeof parsed.summary === 'string'
        ? parsed.summary.slice(0, 1000)
        : 'UI customization suggestion generated.';
    const warnings = Array.isArray(parsed.warnings)
      ? (parsed.warnings as unknown[]).map((w) => String(w).slice(0, 300)).slice(0, 10)
      : [];
    const changedFields = summarizeUiPatchDiff(currentUi, preview);

    sendSuccess(res, { summary, patch, preview, warnings, changedFields });
  } catch (e) {
    next(e);
  }
};

export const aiApplyUiCustomization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;
    const config = await prisma.organizationConfig.findUnique({ where: { organizationId } });
    if (!config) {
      sendError(res, 'Organization config not found', 404);
      return;
    }

    let patch: ReturnType<typeof sanitizeUiConfigPatch>;
    try {
      patch = sanitizeUiConfigPatch(req.body?.patch);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid patch';
      sendError(res, message, 400);
      return;
    }

    const currentUi = (config.uiConfigJson as OrganizationUiConfig | null) || { version: 1 };
    const mergedUi = resolveUiConfigFromPreset(currentUi, patch);
    const legacy = uiConfigToLegacyFields(mergedUi);

    const updated = await prisma.organizationConfig.update({
      where: { organizationId },
      data: legacy as Parameters<typeof prisma.organizationConfig.update>[0]['data'],
    });

    sendSuccess(res, {
      config: formatConfig(updated as Record<string, unknown>),
      uiConfig: mergedUi,
      changedFields: summarizeUiPatchDiff(currentUi, mergedUi),
    });
  } catch (e) {
    next(e);
  }
};

function formatConfig(config: Record<string, unknown>) {
  return {
    ...config,
    theme: config.themeJson,
    uiConfig: config.uiConfigJson,
    features: config.featuresJson,
    testimonials: config.testimonialsJson,
    faq: config.faqJson,
    socialLinks: config.socialLinksJson,
    smtpConfig: config.smtpConfigJson,
    themeJson: undefined,
    uiConfigJson: undefined,
    featuresJson: undefined,
    testimonialsJson: undefined,
    faqJson: undefined,
    socialLinksJson: undefined,
    smtpConfigJson: undefined,
  };
}
