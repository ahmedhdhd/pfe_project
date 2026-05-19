"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContentFormData } from "./types";

interface MarkdownFieldsProps {
  formData: ContentFormData;
  onUpdate: (updates: Partial<ContentFormData>) => void;
}

export function MarkdownFields({ formData, onUpdate }: MarkdownFieldsProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="markdownBody">Markdown Content *</Label>
      <Textarea
        id="markdownBody"
        placeholder="Write the lesson using Markdown: headings, lists, links, code blocks..."
        value={formData.markdownBody}
        onChange={(e) => onUpdate({ markdownBody: e.target.value })}
        rows={12}
        className="font-mono text-sm"
        required
      />
      <p className="text-xs text-muted-foreground">
        Supports Markdown formatting and will render inside the course player.
      </p>
    </div>
  );
}
