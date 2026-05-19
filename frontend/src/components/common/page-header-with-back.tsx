"use client";

import { ArrowLeft, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

export interface PageHeaderWithBackProps {
  /** Title to display */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Optional thumbnail/image URL */
  thumbnailUrl?: string;
  /** Optional icon to show when no thumbnail */
  icon?: LucideIcon;
  /** Back button click handler */
  onBack: () => void;
  /** Optional custom content to display next to title */
  children?: ReactNode;
  /** Optional className */
  className?: string;
}

/**
 * Reusable page header component with back button
 *
 * Displays a compact header with:
 * - Back button
 * - Optional thumbnail/icon
 * - Title and optional description
 *
 * @example
 * ```tsx
 * <PageHeaderWithBack
 *   title="Biology"
 *   description="Master the fundamentals"
 *   thumbnailUrl="/images/biology.jpg"
 *   onBack={() => router.back()}
 * />
 * ```
 */
export function PageHeaderWithBack({
  title,
  description,
  thumbnailUrl,
  icon: Icon,
  onBack,
  children,
  className,
}: PageHeaderWithBackProps) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${className || ""}`}>
      <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Thumbnail or Icon */}
        {thumbnailUrl ? (
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border/60 shrink-0">
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : Icon ? (
          <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-border/60 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        ) : null}

        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
