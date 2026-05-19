"use client";

import { ReactNode } from "react";

export interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional subtitle or count text */
  subtitle?: string;
  /** Optional custom content to display on the right */
  action?: ReactNode;
  /** Show accent bar */
  showAccent?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Reusable section header component
 *
 * Displays a section header with:
 * - Optional accent bar
 * - Title and subtitle
 * - Optional action element
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   title="Chapters"
 *   subtitle="4 Chapters available"
 *   showAccent
 * />
 * ```
 */
export function SectionHeader({
  title,
  subtitle,
  action,
  showAccent = true,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between mb-1 ${className || ""}`}
    >
      <div className="flex items-center gap-2">
        {showAccent && <div className="w-1 h-5 bg-primary rounded-full" />}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-muted-foreground text-xs mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
