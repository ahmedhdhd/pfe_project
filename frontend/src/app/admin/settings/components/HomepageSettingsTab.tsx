"use client";

import { Dispatch, SetStateAction } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { CreateOrganizationConfigData } from "@/lib/types/api";
import { FileUpload } from "@/components/common/file-upload";

function isImageSource(value?: string): boolean {
  if (!value) return false;
  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

interface HomepageSettingsTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
  bannerUrls: string[];
  onBannerUpload: (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => void;
  onBannerRemove: (index: number) => void;
  features: Array<{ title: string; description: string; icon?: string }>;
  onFeatureAdd: () => void;
  onFeatureUpdate: (
    index: number,
    field: "title" | "description" | "icon",
    value: string
  ) => void;
  onFeatureRemove: (index: number) => void;
  testimonials: Array<{ name: string; message: string; avatar?: string }>;
  onTestimonialAdd: () => void;
  onTestimonialUpdate: (
    index: number,
    field: "name" | "message" | "avatar",
    value: string
  ) => void;
  onTestimonialRemove: (index: number) => void;
  faqs: Array<{ question: string; answer: string }>;
  onFaqAdd: () => void;
  onFaqUpdate: (
    index: number,
    field: "question" | "answer",
    value: string
  ) => void;
  onFaqRemove: (index: number) => void;
}

export function HomepageSettingsTab({
  formData,
  setFormData,
  bannerUrls,
  onBannerUpload,
  onBannerRemove,
  features,
  onFeatureAdd,
  onFeatureUpdate,
  onFeatureRemove,
  testimonials,
  onTestimonialAdd,
  onTestimonialUpdate,
  onTestimonialRemove,
  faqs,
  onFaqAdd,
  onFaqUpdate,
  onFaqRemove,
}: HomepageSettingsTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hero Section</CardTitle>
          <CardDescription>
            Configure the hero section displayed on your homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="heroTitle">Hero Title</Label>
            <Input
              id="heroTitle"
              value={formData.heroTitle || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, heroTitle: e.target.value }))
              }
              placeholder="Welcome to Our Learning Platform"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
            <Textarea
              id="heroSubtitle"
              value={formData.heroSubtitle || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  heroSubtitle: e.target.value,
                }))
              }
              rows={3}
              placeholder="Advance your education with our world-class courses"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctaText">CTA Text</Label>
              <Input
                id="ctaText"
                value={formData.ctaText || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ctaText: e.target.value,
                  }))
                }
                placeholder="Get Started, Enroll Now, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctaUrl">CTA URL</Label>
              <Input
                id="ctaUrl"
                value={formData.ctaUrl || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ctaUrl: e.target.value,
                  }))
                }
                placeholder="/courses or full URL"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Banner Images</CardTitle>
          <CardDescription>
            Upload banner images for your homepage (multiple images supported)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bannerUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {bannerUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative h-32 rounded-lg border overflow-hidden bg-muted"
                >
                  <Image
                    src={url}
                    alt={`Banner ${index + 1}`}
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => onBannerRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <FileUpload
            onUploadComplete={onBannerUpload}
            accept="image/*"
            maxSize={10}
            folder="organization-banners"
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Showcase key features on your homepage
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFeatureAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {features.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No features added yet. Click &quot;Add Feature&quot; to get
              started.
            </p>
          )}

          {features.map((feature, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="font-medium">Feature {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeatureRemove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`feature-title-${index}`}>Title</Label>
                <Input
                  id={`feature-title-${index}`}
                  value={feature.title}
                  onChange={(e) =>
                    onFeatureUpdate(index, "title", e.target.value)
                  }
                  placeholder="Feature title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`feature-description-${index}`}>
                  Description
                </Label>
                <Textarea
                  id={`feature-description-${index}`}
                  value={feature.description}
                  onChange={(e) =>
                    onFeatureUpdate(index, "description", e.target.value)
                  }
                  rows={2}
                  placeholder="Feature description"
                />
              </div>

              <div className="space-y-2">
                <Label>Icon image</Label>
                {feature.icon ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
                    {isImageSource(feature.icon) ? (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-background">
                        <Image
                          src={feature.icon}
                          alt={`${feature.title || "Feature"} icon`}
                          fill
                          sizes="56px"
                          className="object-contain p-1"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-background px-2 text-center text-[11px] font-medium uppercase text-muted-foreground">
                        {feature.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {isImageSource(feature.icon) ? "Icon uploaded" : "Icon key"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {feature.icon}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onFeatureUpdate(index, "icon", "")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    onUploadComplete={(fileData) =>
                      onFeatureUpdate(index, "icon", fileData.url)
                    }
                    accept="image/*"
                    maxSize={2}
                    folder="organization-feature-icons"
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Testimonials</CardTitle>
              <CardDescription>
                Show what your students say about your organization
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTestimonialAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Testimonial
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {testimonials.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No testimonials added yet. Click &quot;Add Testimonial&quot; to
              get started.
            </p>
          )}

          {testimonials.map((testimonial, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="font-medium">Testimonial {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onTestimonialRemove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`testimonial-name-${index}`}>Name</Label>
                <Input
                  id={`testimonial-name-${index}`}
                  value={testimonial.name}
                  onChange={(e) =>
                    onTestimonialUpdate(index, "name", e.target.value)
                  }
                  placeholder="Student name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`testimonial-message-${index}`}>Message</Label>
                <Textarea
                  id={`testimonial-message-${index}`}
                  value={testimonial.message}
                  onChange={(e) =>
                    onTestimonialUpdate(index, "message", e.target.value)
                  }
                  rows={3}
                  placeholder="Testimonial message"
                />
              </div>

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>FAQ</CardTitle>
              <CardDescription>
                Frequently asked questions for your homepage
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFaqAdd}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {faqs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No FAQ added yet. Click &quot;Add Question&quot; to get started.
            </p>
          )}

          {faqs.map((faq, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-start justify-between">
                <h4 className="font-medium">Question {index + 1}</h4>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onFaqRemove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`faq-question-${index}`}>Question</Label>
                <Input
                  id={`faq-question-${index}`}
                  value={faq.question}
                  onChange={(e) =>
                    onFaqUpdate(index, "question", e.target.value)
                  }
                  placeholder="Question"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`faq-answer-${index}`}>Answer</Label>
                <Textarea
                  id={`faq-answer-${index}`}
                  value={faq.answer}
                  onChange={(e) => onFaqUpdate(index, "answer", e.target.value)}
                  rows={2}
                  placeholder="Answer"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
