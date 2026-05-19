"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ContentGridProps {
  /** Content items to display */
  children: ReactNode;
  /** Grid columns configuration */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Gap between items */
  gap?: "sm" | "md" | "lg";
  /** Optional className */
  className?: string;
}

/**
 * Reusable content grid component
 *
 * Displays content items in a responsive grid layout
 *
 * @example
 * ```tsx
 * <ContentGrid>
 *   {contents.map((content) => (
 *     <ContentCard key={content.id} content={content} />
 *   ))}
 * </ContentGrid>
 * ```
 */
export function ContentGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = "lg",
  className,
}: ContentGridProps) {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-4 lg:gap-6",
  };

  // Map column numbers to Tailwind classes (all must be present for JIT)
  const mobileClassMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  };

  const tabletClassMap: Record<number, string> = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };

  const desktopClassMap: Record<number, string> = {
    1: "lg:grid-cols-1",
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  };

  const mobileCols = mobileClassMap[columns.mobile || 1] || "grid-cols-1";
  const tabletCols = tabletClassMap[columns.tablet || 2] || "md:grid-cols-2";
  const desktopCols = desktopClassMap[columns.desktop || 3] || "lg:grid-cols-3";

  return (
    <div
      className={cn(
        "grid",
        mobileCols,
        tabletCols,
        desktopCols,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}
