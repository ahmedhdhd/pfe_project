"use client";

import { CheckCircle2 } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  getCertificateTemplate,
  type CertificateTemplateId,
} from "@/lib/certificate-templates";

export interface CertificatePreviewContent {
  organizationName: string;
  heading: string;
  recipientName: string;
  courseTitle: string;
  batchName: string;
  issuerName: string;
  signerName: string;
  signerTitle: string;
  primaryColor: string;
  secondaryColor: string;
}

interface CertificateTemplatePreviewProps {
  templateId: CertificateTemplateId;
  content: CertificatePreviewContent;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}

export function CertificateTemplatePreview({
  templateId,
  content,
  selected = false,
  compact = false,
  className,
}: CertificateTemplatePreviewProps) {
  const template = getCertificateTemplate(templateId);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/60",
        compact ? "h-36" : "h-44",
        template.previewClass,
        className
      )}
      style={
        {
          "--cert-primary": content.primaryColor,
          "--cert-secondary": content.secondaryColor,
        } as React.CSSProperties
      }
    >
      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div
          className={cn(
            "flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em]",
            template.textClass
          )}
        >
          <span className="truncate">{content.organizationName}</span>
          {selected ? (
            <CheckCircle2
              className={cn("h-4 w-4 shrink-0", template.accentClass)}
            />
          ) : null}
        </div>

        <div className="space-y-1 text-center">
          <div
            className={cn(
              "text-[10px] uppercase tracking-[0.22em]",
              template.mutedClass
            )}
          >
            {content.heading}
          </div>
          <div
            className={cn(
              compact ? "text-base" : "text-lg",
              "font-semibold leading-tight",
              template.accentClass
            )}
            style={{ color: content.primaryColor }}
          >
            {content.recipientName}
          </div>
          <div className={cn("text-[11px]", template.mutedClass)}>
            {content.courseTitle}
          </div>
        </div>

        <div
          className={cn(
            "flex items-center justify-between gap-2 text-[10px]",
            template.mutedClass
          )}
        >
          <span className="truncate">{content.issuerName}</span>
          <span className="truncate text-right">
            {content.signerName}
            {content.signerTitle ? ` · ${content.signerTitle}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
