"use client";

import { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Palette, Type, X } from "lucide-react";
import { CreateOrganizationConfigData } from "@/lib/types/api";
import { FileUpload } from "@/components/common/file-upload";
import { THEME_OPTIONS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ThemeBrandingTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
  isUploadingLogo: boolean;
  isUploadingFavicon: boolean;
  onLogoUpload: (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => void;
  onFaviconUpload: (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => void;
}

const FONT_OPTIONS = [
  {
    label: "Geist",
    value: "var(--font-geist-sans), sans-serif",
    sample: "Neutral and familiar",
  },
  {
    label: "Inter",
    value: "Inter, sans-serif",
    sample: "Existing saved style",
  },
  {
    label: "Manrope",
    value: "Manrope, Avenir Next, Segoe UI, sans-serif",
    sample: "Clean learning product",
  },
  {
    label: "Humanist Sans",
    value: "Aptos, Segoe UI, sans-serif",
    sample: "Modern and compact",
  },
  {
    label: "Readable Sans",
    value: "Verdana, Geneva, sans-serif",
    sample: "Readable for long text",
  },
  {
    label: "Georgia",
    value: "Georgia, serif",
    sample: "Warm editorial tone",
  },
];

export function ThemeBrandingTab({
  formData,
  setFormData,
  isUploadingLogo,
  isUploadingFavicon,
  onLogoUpload,
  onFaviconUpload,
}: ThemeBrandingTabProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Organization Logo</CardTitle>
            <CardDescription>
              Upload your organization logo (recommended size: 200x200px)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.logoUrl && (
              <div className="relative h-32 w-32 rounded-lg border overflow-hidden bg-muted">
                <Image
                  src={formData.logoUrl}
                  alt="Organization logo"
                  className="object-contain"
                  fill
                  sizes="128px"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-7 w-7 p-0"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, logoUrl: undefined }))
                  }
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">Remove logo</span>
                </Button>
              </div>
            )}

            {!formData.logoUrl && (
              <FileUpload
                onUploadComplete={onLogoUpload}
                accept="image/*"
                maxSize={5}
                folder="organization-logos"
                className="w-full"
              />
            )}

            {isUploadingLogo && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading logo...</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favicon</CardTitle>
            <CardDescription>
              Upload your organization favicon (recommended size: 32x32px or
              16x16px)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.faviconUrl && (
              <div className="relative h-16 w-16 rounded-lg border overflow-hidden bg-muted">
                <Image
                  src={formData.faviconUrl}
                  alt="Organization favicon"
                  className="object-contain"
                  fill
                  sizes="64px"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, faviconUrl: undefined }))
                  }
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">Remove favicon</span>
                </Button>
              </div>
            )}

            {!formData.faviconUrl && (
              <FileUpload
                onUploadComplete={onFaviconUpload}
                accept="image/*"
                maxSize={1}
                folder="organization-favicons"
                className="w-full"
              />
            )}

            {isUploadingFavicon && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading favicon...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Brand Appearance</CardTitle>
          </div>
          <CardDescription>
            Set the colors and typography used across the student portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[1fr,1fr,1.2fr]">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary color</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={formData.theme?.primaryColor || "#6366f1"}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      primaryColor: event.target.value,
                    },
                  }))
                }
                className="h-10 w-14 shrink-0 p-1"
              />
              <Input
                value={formData.theme?.primaryColor || "#6366f1"}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      primaryColor: event.target.value,
                    },
                  }))
                }
                placeholder="#6366f1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-color">Secondary color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={formData.theme?.secondaryColor || "#ec4899"}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      secondaryColor: event.target.value,
                    },
                  }))
                }
                className="h-10 w-14 shrink-0 p-1"
              />
              <Input
                value={formData.theme?.secondaryColor || "#ec4899"}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      secondaryColor: event.target.value,
                    },
                  }))
                }
                placeholder="#ec4899"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Font style</Label>
            <Select
              value={
                formData.theme?.fontFamily ||
                "var(--font-geist-sans), sans-serif"
              }
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  theme: {
                    ...prev.theme,
                    fontFamily: value,
                  },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font style" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span>{font.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 lg:col-span-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium">Preview</p>
                <p
                  className="mt-1 text-2xl font-semibold"
                  style={{
                    fontFamily:
                      formData.theme?.fontFamily ||
                      "var(--font-geist-sans), sans-serif",
                  }}
                >
                  {formData.name || "TeslaAcademy"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-md border"
                  style={{
                    backgroundColor: formData.theme?.primaryColor || "#6366f1",
                  }}
                />
                <div
                  className="h-10 w-10 rounded-md border"
                  style={{
                    backgroundColor:
                      formData.theme?.secondaryColor || "#ec4899",
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Theme Presets</CardTitle>
          </div>
          <CardDescription>
            Pick a starting palette, then adjust the colors above if needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {THEME_OPTIONS.map((theme) => {
              const isSelected =
                formData.theme?.primaryColor === theme.primaryColor &&
                formData.theme?.secondaryColor === theme.secondaryColor;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      theme: {
                        ...prev.theme,
                        primaryColor: theme.primaryColor,
                        secondaryColor: theme.secondaryColor,
                      },
                    }))
                  }
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    hover:scale-105 hover:shadow-md
                    ${
                      isSelected
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-border hover:border-primary/50"
                    }
                  `}
                >
                  <div className="space-y-2">
                    <div
                      className={`h-16 rounded-md bg-gradient-to-br ${theme.gradient} shadow-sm`}
                    />
                    <div className="text-left">
                      <p className="font-medium text-sm">{theme.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {theme.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
