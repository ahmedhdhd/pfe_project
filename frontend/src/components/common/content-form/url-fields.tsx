"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ContentFormData } from "./types";

interface UrlFieldsProps {
  formData: ContentFormData;
  onUpdate: (updates: Partial<ContentFormData>) => void;
}

export function UrlFields({ formData, onUpdate }: UrlFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="externalUrl">External URL *</Label>
        <Input
          id="externalUrl"
          type="url"
          placeholder="https://docs.google.com/document/..."
          value={formData.externalUrl}
          onChange={(e) => onUpdate({ externalUrl: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use this for Google Docs, Google Slides, Notion pages, websites, or
          any external learning resource.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="externalProvider">Provider Label</Label>
        <Input
          id="externalProvider"
          placeholder="Google Docs, Google Slides, Notion..."
          value={formData.externalProvider}
          onChange={(e) => onUpdate({ externalProvider: e.target.value })}
        />
      </div>
    </div>
  );
}
