"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/common/file-upload";
import { ContentFormData } from "./types";

interface PdfFieldsProps {
  formData: ContentFormData;
  onUpdate: (updates: Partial<ContentFormData>) => void;
  onPdfFileUpload: (url: string) => void;
}

export function PdfFields({
  formData,
  onUpdate,
  onPdfFileUpload,
}: PdfFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="pdfFile">Upload PDF</Label>
        <FileUpload
          accept=".pdf"
          onUploadComplete={(fileData) => onPdfFileUpload(fileData.url)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pdfUrl">Or Enter PDF URL</Label>
        <Input
          id="pdfUrl"
          placeholder="Or enter PDF URL"
          value={formData.pdfUrl}
          onChange={(e) => onUpdate({ pdfUrl: e.target.value })}
        />
      </div>
    </>
  );
}
