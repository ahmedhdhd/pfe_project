import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { aiService, AiServiceError } from '../utils/ai-service-client';

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
    let config: any = await prisma.organizationConfig.findFirst({
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
    const {
      theme,
      features,
      testimonials,
      faq,
      socialLinks,
      smtpConfig,
      razorpayKeyId: _legacyRazorpayKeyId,
      razorpayKeySecret: _legacyRazorpayKeySecret,
      konnectApiKey: _legacyKonnectApiKey,
      konnectWalletId: _legacyKonnectWalletId,
      paymentGateway: _legacyPaymentGateway,
      ...rest
    } = req.body;
    const data = {
      ...rest,
      organizationId,
      currency: normalizeCurrency(rest.currency),
      themeJson: theme || undefined,
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

export const generateThemeWithAi = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;
    const { description, currentCustomCss } = req.body as {
      description?: string;
      currentCustomCss?: string;
    };

    if (!description?.trim()) {
      sendError(res, 'description is required', 400);
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const generated = await aiService.generateTheme({
      organizationId,
      organizationName: organization?.name || 'QuetzLearn LMS',
      description: description.trim(),
      currentCustomCss: currentCustomCss?.trim() || '',
    });

    sendSuccess(res, generated);
  } catch (e) {
    if (e instanceof AiServiceError) {
      sendError(res, e.message.slice(0, 800), e.statusCode);
      return;
    }
    next(e);
  }
};

export const clearCache = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // In production: clear Redis cache or CDN cache here
    sendSuccess(res, { message: 'Cache cleared successfully' });
  } catch (e) { next(e); }
};

function formatConfig(config: any) {
  const {
    razorpayKeyId,
    razorpayKeySecret,
    konnectApiKey,
    konnectWalletId,
    paymentGateway,
    ...safeConfig
  } = config;
  return {
    ...safeConfig,
    theme: safeConfig.themeJson,
    features: safeConfig.featuresJson,
    testimonials: safeConfig.testimonialsJson,
    faq: safeConfig.faqJson,
    socialLinks: safeConfig.socialLinksJson,
    smtpConfig: safeConfig.smtpConfigJson,
    themeJson: undefined,
    featuresJson: undefined,
    testimonialsJson: undefined,
    faqJson: undefined,
    socialLinksJson: undefined,
    smtpConfigJson: undefined,
    razorpayKeyId: undefined,
    razorpayKeySecret: undefined,
    konnectApiKey: undefined,
    konnectWalletId: undefined,
    paymentGateway: undefined,
  };
}
