"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Monitor,
  Smartphone,
  Save,
  ExternalLink,
  Plus,
  Sparkles,
  X,
} from "@/components/icons";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import { FileUpload } from "@/components/common/file-upload";
import {
  useOrganizationConfigAdmin,
  useGenerateOrganizationTheme,
  useUpdateOrganizationConfig,
} from "@/hooks/api";
import { toast } from "sonner";

type ViewportSize = "desktop" | "mobile";

type EditableFeature = {
  title: string;
  description: string;
  icon: string;
};

type EditableTestimonial = {
  name: string;
  message: string;
  avatar: string;
};

type EditableFaq = {
  question: string;
  answer: string;
};

interface EditableFields {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  motto: string;
  ctaText: string;
  contactEmail: string;
  contactPhone: string;
  supportEmail: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

const normalizeFeature = (feature?: {
  title?: string;
  description?: string;
  icon?: string;
}): EditableFeature => ({
  title: feature?.title || "",
  description: feature?.description || "",
  icon: feature?.icon || "",
});

const normalizeTestimonial = (testimonial?: {
  name?: string;
  message?: string;
  avatar?: string;
}): EditableTestimonial => ({
  name: testimonial?.name || "",
  message: testimonial?.message || "",
  avatar: testimonial?.avatar || "",
});

const normalizeFaq = (faq?: {
  question?: string;
  answer?: string;
}): EditableFaq => ({
  question: faq?.question || "",
  answer: faq?.answer || "",
});

export default function PageEditorPage() {
  const { data: configData, isLoading: configLoading } =
    useOrganizationConfigAdmin();
  const storedConfig = useOrganizationConfigStore((state) => state.config);
  const config = configData?.data ?? storedConfig;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [iframeReady, setIframeReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<EditableFields>({
    heroTitle: config?.heroTitle || "",
    heroSubtitle: config?.heroSubtitle || "",
    heroDescription: config?.description || "",
    motto: config?.motto || "",
    ctaText: config?.ctaText || "Get Started",
    contactEmail: config?.contactEmail || "",
    contactPhone: config?.contactPhone || "",
    supportEmail: config?.supportEmail || "",
    logoUrl: config?.logoUrl || "",
    faviconUrl: config?.faviconUrl || "",
    primaryColor: config?.theme?.primaryColor || "#2563eb",
    secondaryColor: config?.theme?.secondaryColor || "#f97316",
    fontFamily: config?.theme?.fontFamily || "Inter, sans-serif",
  });
  const [bannerUrls, setBannerUrls] = useState<string[]>(
    config?.bannerUrls || []
  );
  const [features, setFeatures] = useState<EditableFeature[]>(
    (config?.features || []).map((feature) => normalizeFeature(feature))
  );
  const [testimonials, setTestimonials] = useState<EditableTestimonial[]>(
    (config?.testimonials || []).map((testimonial) =>
      normalizeTestimonial(testimonial)
    )
  );
  const [faqs, setFaqs] = useState<EditableFaq[]>(
    (config?.faq || []).map((faq) => normalizeFaq(faq))
  );
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    config?.socialLinks || {}
  );
  const updateConfig = useUpdateOrganizationConfig();
  const generateTheme = useGenerateOrganizationTheme();
  const [aiThemePrompt, setAiThemePrompt] = useState("");
  const [aiThemeSummary, setAiThemeSummary] = useState("");

  useEffect(() => {
    if (!config) return;
    setFields({
      heroTitle: config.heroTitle || "",
      heroSubtitle: config.heroSubtitle || "",
      heroDescription: config.description || "",
      motto: config.motto || "",
      ctaText: config.ctaText || "Get Started",
      contactEmail: config.contactEmail || "",
      contactPhone: config.contactPhone || "",
      supportEmail: config.supportEmail || "",
      logoUrl: config.logoUrl || "",
      faviconUrl: config.faviconUrl || "",
      primaryColor: config.theme?.primaryColor || "#2563eb",
      secondaryColor: config.theme?.secondaryColor || "#f97316",
      fontFamily: config.theme?.fontFamily || "Inter, sans-serif",
    });
    setBannerUrls(config.bannerUrls || []);
    setFeatures((config.features || []).map((feature) => normalizeFeature(feature)));
    setTestimonials(
      (config.testimonials || []).map((testimonial) =>
        normalizeTestimonial(testimonial)
      )
    );
    setFaqs((config.faq || []).map((faq) => normalizeFaq(faq)));
    setSocialLinks(config.socialLinks || {});
  }, [config]);

  const iframeUrl = (() => {
    if (typeof window === "undefined") {
      return "";
    }

    const slug = config?.slug?.trim();
    const { protocol, port, hostname } = window.location;
    const portSuffix = port ? `:${port}` : "";

    const previewHost = (() => {
      if (!slug) {
        return hostname;
      }

      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `${slug}.localhost`;
      }

      if (hostname.endsWith(".localhost")) {
        return `${slug}.localhost`;
      }

      if (
        hostname === "teslaacademy.com" ||
        hostname === "www.teslaacademy.com" ||
        hostname.endsWith(".teslaacademy.com")
      ) {
        return `${slug}.teslaacademy.com`;
      }

      if (hostname.endsWith(".teslaacademy.in")) {
        return `${slug}.teslaacademy.in`;
      }

      return hostname;
    })();

    const baseUrl = `${protocol}//${previewHost}${portSuffix}`;
    return `${baseUrl}/`;
  })();

  const sendPreviewPatch = useCallback(
    (patch: Partial<EditableFields>) => {
      if (!iframeRef.current?.contentWindow || !iframeReady) return;
      iframeRef.current.contentWindow.postMessage(
        { type: "TESLA_PREVIEW_PATCH", payload: patch },
        "*"
      );
    },
    [iframeReady]
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "TESLA_PREVIEW_READY") {
        setIframeReady(true);
        sendPreviewPatch(fields);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [fields, sendPreviewPatch]);

  const handleFieldChange = (key: keyof EditableFields, value: string) => {
    const next = { ...fields, [key]: value };
    setFields(next);
    sendPreviewPatch({ [key]: value });
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev) => {
      const next = { ...prev };
      if (value.trim()) {
        next[platform] = value.trim();
      } else {
        delete next[platform];
      }
      return next;
    });
  };

  const handleGenerateAiTheme = async () => {
    if (!aiThemePrompt.trim()) {
      toast.error("Please describe the theme you want first.");
      return;
    }

    try {
      const result = await generateTheme.mutateAsync({
        description: aiThemePrompt.trim(),
        currentCustomCss: config?.customCSS || "",
      });

      if (!result.success || !result.data) {
        toast.error(result.message || "Unable to generate an AI theme right now.");
        return;
      }

      const generated = result.data;
      const nextTheme = {
        primaryColor:
          generated.theme.primaryColor || fields.primaryColor || "#2563eb",
        secondaryColor:
          generated.theme.secondaryColor || fields.secondaryColor || "#f97316",
        fontFamily:
          generated.theme.fontFamily || fields.fontFamily || "Inter, sans-serif",
      };

      setFields((prev) => ({
        ...prev,
        primaryColor: nextTheme.primaryColor || prev.primaryColor,
        secondaryColor: nextTheme.secondaryColor || prev.secondaryColor,
        fontFamily: nextTheme.fontFamily || prev.fontFamily,
      }));
      sendPreviewPatch(nextTheme);
      setAiThemeSummary(generated.summary || generated.themeName || "AI theme applied");
      toast.success(generated.themeName || "AI theme generated");
    } catch {
      toast.error("Failed to generate AI theme");
    }
  };

  const removeBannerUrl = (index: number) =>
    setBannerUrls((prev) => prev.filter((_, i) => i !== index));

  const addTestimonial = () =>
    setTestimonials((prev) => [
      ...prev,
      { name: "", message: "", avatar: "" },
    ]);
  const updateTestimonial = (
    index: number,
    field: keyof EditableTestimonial,
    value: string
  ) =>
    setTestimonials((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  const removeTestimonial = (index: number) =>
    setTestimonials((prev) => prev.filter((_, i) => i !== index));

  const addFaq = () => setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  const updateFaq = (index: number, field: keyof EditableFaq, value: string) =>
    setFaqs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  const removeFaq = (index: number) =>
    setFaqs((prev) => prev.filter((_, i) => i !== index));

  const handleLogoUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    handleFieldChange("logoUrl", fileData.url);
  };

  const handleFaviconUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    handleFieldChange("faviconUrl", fileData.url);
  };

  const handleBannerUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    setBannerUrls((prev) =>
      prev.includes(fileData.url) ? prev : [...prev, fileData.url]
    );
  };

  if (configLoading && !config) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!config) {
      toast.error("Organization config not loaded");
      return;
    }
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        organizationId: config.organizationId,
        name: config.name,
        slug: config.slug,
        heroTitle: fields.heroTitle,
        heroSubtitle: fields.heroSubtitle,
        description: fields.heroDescription,
        motto: fields.motto,
        ctaText: fields.ctaText,
        contactEmail: fields.contactEmail,
        contactPhone: fields.contactPhone,
        supportEmail: fields.supportEmail,
        logoUrl: fields.logoUrl || undefined,
        faviconUrl: fields.faviconUrl || undefined,
        bannerUrls: bannerUrls.length > 0 ? bannerUrls.filter(Boolean) : [],
        features: features.length > 0 ? features : [],
        testimonials: testimonials.length > 0 ? testimonials : [],
        faq: faqs.length > 0 ? faqs : [],
        socialLinks,
        theme: {
          primaryColor: fields.primaryColor,
          secondaryColor: fields.secondaryColor,
          fontFamily: fields.fontFamily,
        },
      });
      toast.success("Page saved successfully");
      try {
        setIframeReady(false);
        iframeRef.current?.contentWindow?.location.reload();
      } catch {
        // ignore iframe reload failures; saved data is still persisted
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="w-[360px] flex-shrink-0 border-r flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h1 className="text-sm font-medium">Page Editor</h1>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Hero title
            </Label>
            <Input
              value={fields.heroTitle}
              onChange={(e) => handleFieldChange("heroTitle", e.target.value)}
              placeholder="Learn without limits"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Hero subtitle
            </Label>
            <Textarea
              value={fields.heroSubtitle}
              onChange={(e) =>
                handleFieldChange("heroSubtitle", e.target.value)
              }
              placeholder="The best platform for your students"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Hero description
            </Label>
            <Textarea
              value={fields.heroDescription}
              onChange={(e) =>
                handleFieldChange("heroDescription", e.target.value)
              }
              placeholder="Join thousands of learners..."
              rows={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Motto
            </Label>
            <Input
              value={fields.motto}
              onChange={(e) => handleFieldChange("motto", e.target.value)}
              placeholder="Your learning motto"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              CTA button text
            </Label>
            <Input
              value={fields.ctaText}
              onChange={(e) => handleFieldChange("ctaText", e.target.value)}
              placeholder="Get Started"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>AI Theme Engine</CardTitle>
                  <CardDescription>
                    Generate colors and typography from a short prompt.
                  </CardDescription>
                </div>
                <Badge variant={generateTheme.isPending ? "secondary" : "default"}>
                  {generateTheme.isPending ? "Generating" : "Ready"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={aiThemePrompt}
                onChange={(e) => setAiThemePrompt(e.target.value)}
                rows={4}
                placeholder="Example: a premium, modern learning platform for exam prep with deep blue accents, soft gradients, and a clean readable font."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateAiTheme}
                  disabled={generateTheme.isPending || !aiThemePrompt.trim()}
                >
                  {generateTheme.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate AI Theme
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAiThemePrompt("")}
                  disabled={generateTheme.isPending || !aiThemePrompt}
                >
                  Clear Prompt
                </Button>
              </div>
              {aiThemeSummary && (
                <p className="text-sm text-muted-foreground">{aiThemeSummary}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Upload the organization logo used on public pages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.logoUrl ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-background">
                    <Image
                      src={fields.logoUrl}
                      alt="Organization logo"
                      fill
                      sizes="64px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">Logo uploaded</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fields.logoUrl}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFieldChange("logoUrl", "")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <FileUpload
                  onUploadComplete={handleLogoUpload}
                  accept="image/*"
                  maxSize={5}
                  folder="organization-logos"
                  className="w-full"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Favicon</CardTitle>
              <CardDescription>
                Upload the favicon shown in browser tabs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.faviconUrl ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-background">
                    <Image
                      src={fields.faviconUrl}
                      alt="Organization favicon"
                      fill
                      sizes="48px"
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Favicon uploaded
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {fields.faviconUrl}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFieldChange("faviconUrl", "")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <FileUpload
                  onUploadComplete={handleFaviconUpload}
                  accept="image/*"
                  maxSize={1}
                  folder="organization-favicons"
                  className="w-full"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Banner Images</CardTitle>
                  <CardDescription>
                    Upload and manage homepage banner images
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onUploadComplete={handleBannerUpload}
                accept="image/*"
                maxSize={10}
                folder="organization-banners"
                className="w-full"
              />
              {bannerUrls.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No banners uploaded yet.
                </p>
              )}
              {bannerUrls.map((bannerUrl, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div className="relative h-16 w-24 overflow-hidden rounded-md border bg-background">
                    <Image
                      src={bannerUrl}
                      alt={`Banner ${index + 1}`}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Banner {index + 1}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {bannerUrl}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBannerUrl(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Testimonials</CardTitle>
                  <CardDescription>
                    Manage the student testimonials on the homepage
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Testimonial
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {testimonials.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No testimonials added yet.
                </p>
              )}
              {testimonials.map((testimonial, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Testimonial {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTestimonial(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={testimonial.name}
                    onChange={(e) =>
                      updateTestimonial(index, "name", e.target.value)
                    }
                    placeholder="Name"
                  />
                  <Textarea
                    value={testimonial.message}
                    onChange={(e) =>
                      updateTestimonial(index, "message", e.target.value)
                    }
                    rows={3}
                    placeholder="Testimonial message"
                  />
                  <div className="space-y-2">
                    <Label>Avatar image</Label>
                    {testimonial.avatar ? (
                      <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-background">
                          <Image
                            src={testimonial.avatar}
                            alt={`${testimonial.name || "Student"} avatar`}
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            Avatar uploaded
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {testimonial.avatar}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            updateTestimonial(index, "avatar", "")
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <FileUpload
                        onUploadComplete={(fileData) =>
                          updateTestimonial(index, "avatar", fileData.url)
                        }
                        accept="image/*"
                        maxSize={2}
                        folder="organization-testimonial-avatars"
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>FAQ</CardTitle>
                  <CardDescription>
                    Edit the homepage questions and answers
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addFaq}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No FAQ entries added yet.
                </p>
              )}
              {faqs.map((faq, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Question {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFaq(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={faq.question}
                    onChange={(e) => updateFaq(index, "question", e.target.value)}
                    placeholder="Question"
                  />
                  <Textarea
                    value={faq.answer}
                    onChange={(e) => updateFaq(index, "answer", e.target.value)}
                    rows={3}
                    placeholder="Answer"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Support</CardTitle>
              <CardDescription>
                Contact details and social links shown on the public site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Contact email</Label>
                  <Input
                    type="email"
                    value={fields.contactEmail}
                    onChange={(e) =>
                      handleFieldChange("contactEmail", e.target.value)
                    }
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact phone</Label>
                  <Input
                    value={fields.contactPhone}
                    onChange={(e) =>
                      handleFieldChange("contactPhone", e.target.value)
                    }
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Support email</Label>
                  <Input
                    type="email"
                    value={fields.supportEmail}
                    onChange={(e) =>
                      handleFieldChange("supportEmail", e.target.value)
                    }
                    placeholder="support@example.com"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Social links</Label>
                  <p className="text-xs text-muted-foreground">
                    These show in the public footer.
                  </p>
                </div>
                {["facebook", "instagram", "twitter", "linkedin", "youtube"].map(
                  (platform) => (
                    <div key={platform} className="space-y-2">
                      <Label className="capitalize">{platform}</Label>
                      <Input
                        value={socialLinks[platform] || ""}
                        onChange={(e) =>
                          handleSocialLinkChange(platform, e.target.value)
                        }
                        placeholder={`https://${platform}.com/your-page`}
                      />
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Primary color
            </Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={fields.primaryColor}
                onChange={(e) =>
                  handleFieldChange("primaryColor", e.target.value)
                }
                className="h-9 w-12 rounded border cursor-pointer"
              />
              <Input
                value={fields.primaryColor}
                onChange={(e) =>
                  handleFieldChange("primaryColor", e.target.value)
                }
                placeholder="#2563eb"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Secondary color
            </Label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={fields.secondaryColor}
                onChange={(e) =>
                  handleFieldChange("secondaryColor", e.target.value)
                }
                className="h-9 w-12 rounded border cursor-pointer"
              />
              <Input
                value={fields.secondaryColor}
                onChange={(e) =>
                  handleFieldChange("secondaryColor", e.target.value)
                }
                placeholder="#f97316"
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Font family
            </Label>
            <select
              value={fields.fontFamily}
              onChange={(e) => handleFieldChange("fontFamily", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="var(--font-geist-sans), sans-serif">Geist</option>
              <option value="Manrope, Avenir Next, Segoe UI, sans-serif">
                Manrope
              </option>
              <option value="Aptos, Segoe UI, sans-serif">Humanist Sans</option>
              <option value="Verdana, Geneva, sans-serif">Verdana</option>
              <option value="Georgia, serif">Georgia</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-1">
            <Button
              variant={viewport === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewport("desktop")}
              className="h-8 w-8 p-0"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewport === "mobile" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewport("mobile")}
              className="h-8 w-8 p-0"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
            {iframeUrl}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(iframeUrl, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto flex items-start justify-center p-4">
          <div
            className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 border"
            style={{
              width: viewport === "desktop" ? "100%" : "390px",
              maxWidth: viewport === "desktop" ? "1280px" : "390px",
              height: "calc(100vh - 120px)",
            }}
          >
            {!iframeReady && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={iframeUrl}
              className="w-full h-full border-0"
              style={{ opacity: iframeReady ? 1 : 0, transition: "opacity 0.3s" }}
              onLoad={() => {
                setTimeout(() => setIframeReady(true), 800);
              }}
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

