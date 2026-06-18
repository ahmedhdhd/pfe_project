"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Monitor, Smartphone, Save, ExternalLink } from "@/components/icons";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import {
  useOrganizationConfigAdmin,
  useUpdateOrganizationConfig,
} from "@/hooks/api";
import { toast } from "sonner";

type PreviewTarget = "homepage" | "student";
type ViewportSize = "desktop" | "mobile";

interface EditableFields {
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export default function PageEditorPage() {
  const { data: configData, isLoading: configLoading } =
    useOrganizationConfigAdmin();
  const storedConfig = useOrganizationConfigStore((state) => state.config);
  const config = configData?.data ?? storedConfig;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget>("homepage");
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [iframeReady, setIframeReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState<EditableFields>({
    heroTitle: config?.heroTitle || "",
    heroSubtitle: config?.heroSubtitle || "",
    ctaText: config?.ctaText || "Get Started",
    primaryColor: config?.theme?.primaryColor || "#2563eb",
    secondaryColor: config?.theme?.secondaryColor || "#f97316",
    fontFamily: config?.theme?.fontFamily || "Inter, sans-serif",
  });
  const updateConfig = useUpdateOrganizationConfig();

  useEffect(() => {
    if (!config) return;
    setFields({
      heroTitle: config.heroTitle || "",
      heroSubtitle: config.heroSubtitle || "",
      ctaText: config.ctaText || "Get Started",
      primaryColor: config.theme?.primaryColor || "#2563eb",
      secondaryColor: config.theme?.secondaryColor || "#f97316",
      fontFamily: config.theme?.fontFamily || "Inter, sans-serif",
    });
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
    return previewTarget === "homepage"
      ? `${baseUrl}/`
      : `${baseUrl}/student/my-learning`;
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
        ctaText: fields.ctaText,
        theme: {
          primaryColor: fields.primaryColor,
          secondaryColor: fields.secondaryColor,
          fontFamily: fields.fontFamily,
        },
      });
      toast.success("Page saved successfully");
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

        <div className="px-4 pt-3">
          <Tabs
            value={previewTarget}
            onValueChange={(v) => {
              setPreviewTarget(v as PreviewTarget);
              setIframeReady(false);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="homepage" className="flex-1">
                Homepage
              </TabsTrigger>
              <TabsTrigger value="student" className="flex-1">
                Student space
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {previewTarget === "homepage" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Hero title
                </Label>
                <Input
                  value={fields.heroTitle}
                  onChange={(e) =>
                    handleFieldChange("heroTitle", e.target.value)
                  }
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
                  CTA button text
                </Label>
                <Input
                  value={fields.ctaText}
                  onChange={(e) =>
                    handleFieldChange("ctaText", e.target.value)
                  }
                  placeholder="Get Started"
                />
              </div>
            </>
          )}

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

