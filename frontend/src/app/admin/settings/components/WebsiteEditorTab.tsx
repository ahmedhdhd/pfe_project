"use client";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
  ExternalLink,
  Plus,
  Sparkles,
  X,
} from "@/components/icons";
import { FileUpload } from "@/components/common/file-upload";
import { CreateOrganizationConfigData } from "@/lib/types/api";
import { PLATFORM_BASE_DOMAINS } from "@/lib/constants";

type UploadedFileData = {
  key: string;
  url: string;
  bucket: string;
  originalName: string;
  size: number;
  mimeType: string;
};

type EditableTestimonial = {
  name: string;
  message: string;
  avatar?: string;
};

type EditableFaq = {
  question: string;
  answer: string;
};

interface WebsiteEditorTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
  bannerUrls: string[];
  onBannerUpload: (fileData: UploadedFileData) => void;
  onBannerRemove: (index: number) => void;
  testimonials: EditableTestimonial[];
  onTestimonialAdd: () => void;
  onTestimonialUpdate: (
    index: number,
    field: "name" | "message" | "avatar",
    value: string
  ) => void;
  onTestimonialRemove: (index: number) => void;
  faqs: EditableFaq[];
  onFaqAdd: () => void;
  onFaqUpdate: (index: number, field: "question" | "answer", value: string) => void;
  onFaqRemove: (index: number) => void;
  isGeneratingAiTheme: boolean;
  onGenerateAiTheme: (description: string) => Promise<void>;
}

// Base domains that serve tenant homepages on subdomains. Must stay in sync
// with the list in frontend/src/middleware.ts.
const PREVIEW_BASE_DOMAINS = PLATFORM_BASE_DOMAINS;

const FONT_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "var(--font-geist-sans), sans-serif", label: "Geist" },
  {
    value: "Manrope, Avenir Next, Segoe UI, sans-serif",
    label: "Manrope",
  },
  { value: "Aptos, Segoe UI, sans-serif", label: "Humanist Sans" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "Georgia, serif", label: "Georgia" },
];

export function WebsiteEditorTab({
  formData,
  setFormData,
  bannerUrls,
  onBannerUpload,
  onBannerRemove,
  testimonials,
  onTestimonialAdd,
  onTestimonialUpdate,
  onTestimonialRemove,
  faqs,
  onFaqAdd,
  onFaqUpdate,
  onFaqRemove,
  isGeneratingAiTheme,
  onGenerateAiTheme,
}: WebsiteEditorTabProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [iframeReady, setIframeReady] = useState(false);
  const [aiThemePrompt, setAiThemePrompt] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  // Resolve the tenant homepage URL (<slug>.<base-domain>) from the current
  // admin host. Computed client-side only, in an effect, to avoid SSR issues.
  useEffect(() => {
    const slug = formData.slug?.trim();
    if (!slug || typeof window === "undefined") {
      setPreviewUrl("");
      return;
    }

    const { protocol, port, hostname } = window.location;
    const portSuffix = port ? `:${port}` : "";

    let previewHost = hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".localhost")
    ) {
      previewHost = `${slug}.localhost`;
    } else {
      for (const base of PREVIEW_BASE_DOMAINS) {
        if (
          hostname === base ||
          hostname === `www.${base}` ||
          hostname.endsWith(`.${base}`)
        ) {
          previewHost = `${slug}.${base}`;
          break;
        }
      }
    }

    setPreviewUrl(`${protocol}//${previewHost}${portSuffix}/`);
  }, [formData.slug]);

  const buildPatch = useCallback(
    () => ({
      heroTitle: formData.heroTitle || "",
      heroSubtitle: formData.heroSubtitle || "",
      heroDescription: formData.description || "",
      motto: formData.motto || "",
      ctaText: formData.ctaText || "",
      primaryColor: formData.theme?.primaryColor,
      secondaryColor: formData.theme?.secondaryColor,
      fontFamily: formData.theme?.fontFamily,
    }),
    [
      formData.heroTitle,
      formData.heroSubtitle,
      formData.description,
      formData.motto,
      formData.ctaText,
      formData.theme?.primaryColor,
      formData.theme?.secondaryColor,
      formData.theme?.fontFamily,
    ]
  );

  const sendPreviewPatch = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !iframeReady) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "TESLA_PREVIEW_PATCH", payload: buildPatch() },
      "*"
    );
  }, [iframeReady, buildPatch]);

  // Push a live patch whenever an editable field changes (covers manual edits
  // and AI-generated themes alike).
  useEffect(() => {
    sendPreviewPatch();
  }, [sendPreviewPatch]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "TESLA_PREVIEW_READY") {
        setIframeReady(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const setField = (
    key:
      | "heroTitle"
      | "heroSubtitle"
      | "description"
      | "motto"
      | "ctaText"
      | "logoUrl"
      | "faviconUrl",
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const setThemeField = (
    key: "primaryColor" | "secondaryColor" | "fontFamily",
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      theme: { ...prev.theme, [key]: value },
    }));
  };

  const handleGenerateClick = async () => {
    if (!aiThemePrompt.trim()) return;
    await onGenerateAiTheme(aiThemePrompt.trim());
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
      {/* Editor sidebar */}
      <div className="space-y-5 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:pr-2">
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
            <CardDescription>
              Headline content shown at the top of your homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Hero title</Label>
              <Input
                value={formData.heroTitle || ""}
                onChange={(e) => setField("heroTitle", e.target.value)}
                placeholder="Learn without limits"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hero subtitle</Label>
              <Textarea
                value={formData.heroSubtitle || ""}
                onChange={(e) => setField("heroSubtitle", e.target.value)}
                placeholder="The best platform for your students"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hero description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Join thousands of learners..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Motto</Label>
              <Input
                value={formData.motto || ""}
                onChange={(e) => setField("motto", e.target.value)}
                placeholder="Your learning motto"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CTA button text</Label>
              <Input
                value={formData.ctaText || ""}
                onChange={(e) => setField("ctaText", e.target.value)}
                placeholder="Get Started"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>AI Theme Engine</CardTitle>
                <CardDescription>
                  Generate colors and typography from a short prompt.
                </CardDescription>
              </div>
              <Badge variant={isGeneratingAiTheme ? "secondary" : "default"}>
                {isGeneratingAiTheme ? "Generating" : "Ready"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={aiThemePrompt}
              onChange={(e) => setAiThemePrompt(e.target.value)}
              rows={4}
              placeholder="Example: A modern medical exam prep LMS. Clean white surfaces, confident blue accents, soft gradients, high readability, and polished CTA buttons."
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={handleGenerateClick}
                disabled={isGeneratingAiTheme || !aiThemePrompt.trim()}
              >
                {isGeneratingAiTheme ? (
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
                disabled={isGeneratingAiTheme || !aiThemePrompt}
              >
                Clear Prompt
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colors & Typography</CardTitle>
            <CardDescription>
              Brand colors and font used across the public site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Primary color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={formData.theme?.primaryColor || "#6366f1"}
                  onChange={(e) => setThemeField("primaryColor", e.target.value)}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={formData.theme?.primaryColor || ""}
                  onChange={(e) => setThemeField("primaryColor", e.target.value)}
                  placeholder="#6366f1"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Secondary color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={formData.theme?.secondaryColor || "#ec4899"}
                  onChange={(e) =>
                    setThemeField("secondaryColor", e.target.value)
                  }
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={formData.theme?.secondaryColor || ""}
                  onChange={(e) =>
                    setThemeField("secondaryColor", e.target.value)
                  }
                  placeholder="#ec4899"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Font family</Label>
              <select
                value={
                  formData.theme?.fontFamily ||
                  "var(--font-geist-sans), sans-serif"
                }
                onChange={(e) => setThemeField("fontFamily", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
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
            {formData.logoUrl ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-md border bg-background">
                  <Image
                    src={formData.logoUrl}
                    alt="Organization logo"
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Logo uploaded</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formData.logoUrl}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setField("logoUrl", "")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileUpload
                onUploadComplete={(fileData) =>
                  setField("logoUrl", fileData.url)
                }
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
            {formData.faviconUrl ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-md border bg-background">
                  <Image
                    src={formData.faviconUrl}
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
                    {formData.faviconUrl}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setField("faviconUrl", "")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileUpload
                onUploadComplete={(fileData) =>
                  setField("faviconUrl", fileData.url)
                }
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
            <CardTitle>Banner Images</CardTitle>
            <CardDescription>
              Upload and manage homepage banner images
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUpload
              onUploadComplete={onBannerUpload}
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
                  onClick={() => onBannerRemove(index)}
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
                  Student testimonials shown on the homepage
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onTestimonialAdd}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
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
                    onClick={() => onTestimonialRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={testimonial.name}
                  onChange={(e) =>
                    onTestimonialUpdate(index, "name", e.target.value)
                  }
                  placeholder="Name"
                />
                <Textarea
                  value={testimonial.message}
                  onChange={(e) =>
                    onTestimonialUpdate(index, "message", e.target.value)
                  }
                  rows={3}
                  placeholder="Testimonial message"
                />
                <div className="space-y-2">
                  <Label>Photo</Label>
                  {testimonial.avatar ? (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-background">
                        <Image
                          src={testimonial.avatar}
                          alt={`${testimonial.name || "Student"} photo`}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          Photo uploaded
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Shown next to the testimonial on the homepage
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onTestimonialUpdate(index, "avatar", "")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <FileUpload
                      onUploadComplete={(fileData) =>
                        onTestimonialUpdate(index, "avatar", fileData.url)
                      }
                      accept="image/*"
                      maxSize={5}
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
                  Homepage questions and answers
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={onFaqAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add
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
                    onClick={() => onFaqRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  value={faq.question}
                  onChange={(e) => onFaqUpdate(index, "question", e.target.value)}
                  placeholder="Question"
                />
                <Textarea
                  value={faq.answer}
                  onChange={(e) => onFaqUpdate(index, "answer", e.target.value)}
                  rows={3}
                  placeholder="Answer"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Live preview */}
      <div className="flex flex-col rounded-xl border overflow-hidden bg-muted/30 lg:h-[calc(100vh-16rem)] h-[600px]">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={viewport === "desktop" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewport("desktop")}
              className="h-8 w-8 p-0"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={viewport === "mobile" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewport("mobile")}
              className="h-8 w-8 p-0"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {previewUrl || "Preview unavailable — organization slug missing"}
            </p>
            {previewUrl && (
              <Button asChild type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex justify-center overflow-hidden bg-muted/40 p-3">
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              title="Homepage preview"
              className={`h-full rounded-lg border bg-background shadow-sm transition-all duration-300 ${
                viewport === "mobile" ? "w-[390px]" : "w-full"
              }`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Save your organization settings first to enable the preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
