"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, BookOpen, Link2, Braces } from "@/components/icons";
import { ContentType } from "./types";

interface ContentTypeSelectorProps {
  value: ContentType;
  onChange: (value: ContentType) => void;
}

export function ContentTypeSelector({
  value,
  onChange,
}: ContentTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="type">Content Type *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="type" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ContentType.LECTURE}>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Lecture</span>
            </div>
          </SelectItem>
          <SelectItem value={ContentType.PDF}>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>PDF</span>
            </div>
          </SelectItem>
          <SelectItem value={ContentType.MARKDOWN}>
            <div className="flex items-center space-x-2">
              <Braces className="h-4 w-4" />
              <span>Markdown</span>
            </div>
          </SelectItem>
          <SelectItem value={ContentType.URL}>
            <div className="flex items-center space-x-2">
              <Link2 className="h-4 w-4" />
              <span>External URL</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
