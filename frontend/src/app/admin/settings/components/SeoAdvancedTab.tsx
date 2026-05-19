"use client";

import { Dispatch, SetStateAction } from "react";
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
import { CreateOrganizationConfigData } from "@/lib/types/api";

interface SeoAdvancedTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
}

export function SeoAdvancedTab({ formData, setFormData }: SeoAdvancedTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
          <CardDescription>
            Control how your site appears in search results and social media.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title</Label>
            <Input
              id="metaTitle"
              value={formData.metaTitle || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))
              }
              placeholder="Site title for SEO"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description</Label>
            <Textarea
              id="metaDescription"
              value={formData.metaDescription || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  metaDescription: e.target.value,
                }))
              }
              rows={3}
              placeholder="Short description shown in search results"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ogImage">OG Image URL</Label>
            <Input
              id="ogImage"
              value={formData.ogImage || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ogImage: e.target.value }))
              }
              placeholder="Image URL for social sharing"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Code</CardTitle>
          <CardDescription>
            Add custom CSS or JavaScript snippets. Use carefully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customCSS">Custom CSS</Label>
            <Textarea
              id="customCSS"
              value={formData.customCSS || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customCSS: e.target.value }))
              }
              rows={4}
              spellCheck={false}
              placeholder="/* Your custom CSS */"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customJS">Custom JavaScript</Label>
            <Textarea
              id="customJS"
              value={formData.customJS || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customJS: e.target.value }))
              }
              rows={4}
              spellCheck={false}
              placeholder="// Your custom JS"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
