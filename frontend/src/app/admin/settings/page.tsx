"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { useCurrentUser } from "@/hooks";
import {
  useOrganizationConfigAdmin,
  useGenerateOrganizationTheme,
  useUpdateOrganizationConfig,
} from "@/hooks/api";
import { CreateOrganizationConfigData } from "@/lib/types/api";
import {
  Loader2,
  Save,
  Building2,
  Mail,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Settings2,
  Layout,
} from "@/components/icons";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { GeneralSettingsTab } from "./components/GeneralSettingsTab";
import { WebsiteEditorTab } from "./components/WebsiteEditorTab";
import { PaymentSettingsTab } from "./components/PaymentSettingsTab";
import { ContactSettingsTab } from "./components/ContactSettingsTab";
import { SeoAdvancedTab } from "./components/SeoAdvancedTab";

const SETTINGS_TABS = ["general", "website", "payment", "seo", "contact"];

const normalizeCurrency = (currency?: string) => {
  const normalized = currency?.trim().toUpperCase();
  return normalized === "TND" || normalized === "USD" || normalized === "EUR"
    ? normalized
    : "TND";
};

const extractMutationErrorMessage = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "Unable to generate an AI theme right now.";
  }

  const apiError = error as {
    response?: {
      data?: {
        message?: string;
        error?: string;
        detail?: string;
      };
    };
    message?: string;
  };

  return (
    apiError.response?.data?.message ||
    apiError.response?.data?.error ||
    apiError.response?.data?.detail ||
    apiError.message ||
    "Unable to generate an AI theme right now."
  );
};

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") || "";
  const initialTab = SETTINGS_TABS.includes(requestedTab)
    ? requestedTab
    : "general";
  const { data: currentUser } = useCurrentUser();
  const { data: configData, isLoading: configLoading } =
    useOrganizationConfigAdmin();
  const updateMutation = useUpdateOrganizationConfig();
  const generateThemeMutation = useGenerateOrganizationTheme();
  const [bannerUrls, setBannerUrls] = useState<string[]>([]);
  const [features, setFeatures] = useState<
    Array<{ title: string; description: string; icon?: string }>
  >([]);
  const [testimonials, setTestimonials] = useState<
    Array<{ name: string; message: string; avatar?: string }>
  >([]);
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>(
    []
  );

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const [formData, setFormData] = useState<CreateOrganizationConfigData>({
    organizationId: currentUser?.organizationId || "",
    name: "",
    slug: "",
    theme: {
      primaryColor: "#6366f1",
      secondaryColor: "#ec4899",
      fontFamily: "var(--font-geist-sans), sans-serif",
    },
    maintenanceMode: false,
    currency: "TND",
    paymentGateway: "STRIPE",
    supportEmail: "",
    contactEmail: "",
    contactPhone: "",
    smtpConfig: {
      host: "",
      port: 587,
      user: "",
      pass: "",
      from: "",
    },
    description: "",
    ctaText: "",
    ctaUrl: "",
    metaTitle: "",
    metaDescription: "",
    openRouterApiKey: "",
  });

  // Load config data when available
  useEffect(() => {
    if (configData?.success && configData.data) {
      const config = configData.data;
      setFormData({
        organizationId: config.organizationId,
        name: config.name,
        slug: config.slug,
        domain: config.domain,
        contactEmail: config.contactEmail || "",
        contactPhone: config.contactPhone || "",
        smtpConfig: {
          host: config.smtpConfig?.host || "",
          port: config.smtpConfig?.port || 587,
          user: config.smtpConfig?.user || "",
          pass: config.smtpConfig?.pass || "",
          from: config.smtpConfig?.from || "",
        },
        currency: normalizeCurrency(config.currency),
        description: config.description || "",
        theme: {
          primaryColor: config.theme?.primaryColor || "#6366f1",
          secondaryColor: config.theme?.secondaryColor || "#ec4899",
          fontFamily:
            config.theme?.fontFamily ||
            "var(--font-geist-sans), sans-serif",
        },
        maintenanceMode: config.maintenanceMode || false,
        supportEmail: config.supportEmail || "",
        // Stripe is the only supported gateway now
        paymentGateway: "STRIPE",
        logoUrl: config.logoUrl,
        faviconUrl: config.faviconUrl,
        heroTitle: config.heroTitle,
        heroSubtitle: config.heroSubtitle,
        motto: config.motto,
        openRouterApiKey: config.openRouterApiKey || "",
        paymentMode: config.paymentMode === 'subscription' ? 'per_course' : (config.paymentMode || 'per_course'),
        subscriptionPrice: config.subscriptionPrice || 0,
        subscriptionType: config.subscriptionType || 'onetime',
        metaTitle: config.metaTitle,
        metaDescription: config.metaDescription,
        featuresEnabled: config.featuresEnabled,
        ctaText: config.ctaText,
        ctaUrl: config.ctaUrl,
        ogImage: config.ogImage,
        socialLinks: config.socialLinks,
        customCSS: config.customCSS,
        customJS: config.customJS,
      });
      setBannerUrls(config.bannerUrls || []);
      setFeatures(config.features || []);
      setTestimonials(config.testimonials || []);
      setFaqs(config.faq || []);
    } else if (currentUser && !configData?.data) {
      setFormData(prev => ({
        ...prev,
        organizationId: currentUser.organizationId || prev.organizationId,
        name: currentUser.organizationName || prev.name,
        slug: currentUser.organizationSlug || prev.slug,
        currency: normalizeCurrency(prev.currency),
      }));
    }
  }, [configData, currentUser]);

  useEffect(() => {
    const stripeConnectStatus = searchParams.get("stripe_connect");
    if (!stripeConnectStatus) return;

    if (stripeConnectStatus === "connected") {
      toast.success("Stripe account connected successfully");
    } else if (stripeConnectStatus === "failed") {
      const reason =
        searchParams.get("reason") || "Failed to connect Stripe account";
      toast.error(reason);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("stripe_connect");
    url.searchParams.delete("reason");
    window.history.replaceState({}, "", url.toString());
  }, [searchParams]);

  const handleBannerUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    setBannerUrls((prev) => [...prev, fileData.url]);
  };

  const handleRemoveBanner = (index: number) => {
    setBannerUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTestimonial = () => {
    setTestimonials([...testimonials, { name: "", message: "", avatar: "" }]);
  };

  const handleUpdateTestimonial = (
    index: number,
    field: "name" | "message" | "avatar",
    value: string
  ) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setTestimonials(updated);
  };

  const handleRemoveTestimonial = (index: number) => {
    setTestimonials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const handleUpdateFaq = (
    index: number,
    field: "question" | "answer",
    value: string
  ) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateAiTheme = async (description: string) => {
    try {
      const result = await generateThemeMutation.mutateAsync({
        description,
        currentCustomCss: formData.customCSS || "",
      });

      if (!result.success || !result.data) {
        toast.error(result.message || "Unable to generate an AI theme right now.");
        return;
      }

      const generated = result.data;
      setFormData((prev) => ({
        ...prev,
        theme: {
          ...prev.theme,
          primaryColor:
            generated.theme.primaryColor ||
            prev.theme?.primaryColor ||
            "#6366f1",
          secondaryColor:
            generated.theme.secondaryColor ||
            prev.theme?.secondaryColor ||
            "#ec4899",
          fontFamily:
            generated.theme.fontFamily ||
            prev.theme?.fontFamily ||
            "var(--font-geist-sans), sans-serif",
        },
        // Persist only the policy-approved CSS returned by the AI service.
        customCSS:
          generated.approvedCustomCss ||
          generated.customCss ||
          prev.customCSS,
      }));

      toast.success(generated.themeName || "AI theme generated", {
        description: generated.summary || "The generated theme has been applied to the form.",
      });
    } catch (error: unknown) {
      toast.error("Theme generation failed", {
        description: extractMutationErrorMessage(error),
      });
    }
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setFormData((prev) => {
      const nextLinks = { ...(prev.socialLinks || {}) };
      if (value.trim()) {
        nextLinks[platform] = value.trim();
      } else {
        delete nextLinks[platform];
      }
      return {
        ...prev,
        socialLinks: Object.keys(nextLinks).length > 0 ? nextLinks : undefined,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        bannerUrls: bannerUrls.length > 0 ? bannerUrls : undefined,
        features: features.length > 0 ? features : undefined,
        testimonials: testimonials.length > 0 ? testimonials : undefined,
        faq: faqs.length > 0 ? faqs : undefined,
      };
      const result = await updateMutation.mutateAsync(submitData);
      if (result.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      setShowErrorModal(true);
      console.error("Failed to update settings:", error);
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          (configData?.success && configData.data?.name)
            ? `${configData.data.name} — Settings`
            : currentUser?.organizationName
              ? `${currentUser.organizationName} Settings`
              : "Settings"
        }
        description={
          (configData?.success && configData.data)
            ? `  `
            : (currentUser?.organizationName && currentUser?.organizationSlug)
              ? `Organization: ${currentUser.organizationName} · Slug: ${currentUser.organizationSlug}`
              : "Manage your organization settings, theme, and configuration"
        }
      />

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">
              <Building2 className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="website">
              <Layout className="h-4 w-4 mr-2" />
              Website
            </TabsTrigger>
            <TabsTrigger value="payment">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Settings2 className="h-4 w-4 mr-2" />
              SEO
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Mail className="h-4 w-4 mr-2" />
              Contact & Support
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <GeneralSettingsTab formData={formData} setFormData={setFormData} />
          </TabsContent>

          {/* Website - live homepage editor */}
          <TabsContent value="website" className="space-y-4">
            <WebsiteEditorTab
              formData={formData}
              setFormData={setFormData}
              bannerUrls={bannerUrls}
              onBannerUpload={handleBannerUpload}
              onBannerRemove={handleRemoveBanner}
              testimonials={testimonials}
              onTestimonialAdd={handleAddTestimonial}
              onTestimonialUpdate={handleUpdateTestimonial}
              onTestimonialRemove={handleRemoveTestimonial}
              faqs={faqs}
              onFaqAdd={handleAddFaq}
              onFaqUpdate={handleUpdateFaq}
              onFaqRemove={handleRemoveFaq}
              isGeneratingAiTheme={generateThemeMutation.isPending}
              onGenerateAiTheme={handleGenerateAiTheme}
            />
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment" className="space-y-4">
            <PaymentSettingsTab
              formData={formData}
              setFormData={setFormData}
            />
          </TabsContent>

          {/* Contact & Support */}
          <TabsContent value="contact" className="space-y-4">
            <ContactSettingsTab
              formData={formData}
              setFormData={setFormData}
              onSocialLinkChange={handleSocialLinkChange}
            />
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo" className="space-y-4">
            <SeoAdvancedTab formData={formData} setFormData={setFormData} />
          </TabsContent>

        </Tabs>

        <div className="flex justify-end mt-6">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="min-w-[120px]"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <AlertDialogTitle>Settings Saved Successfully!</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              Your organization settings have been updated successfully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSuccessModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Modal */}
      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <AlertDialogTitle>Failed to Update Settings</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              There was an error updating your settings. Please try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowErrorModal(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
