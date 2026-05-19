"use client";

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PremiumTabsTriggerProps
  extends React.ComponentProps<typeof TabsTrigger> {
  /** Icon to display in the tab */
  icon?: LucideIcon;
  /** Count badge value */
  count?: number;
  /** Badge color variant */
  badgeVariant?: "default" | "danger";
  /** Mobile label (if different from children) */
  mobileLabel?: string;
  /** Show underline indicator */
  showUnderline?: boolean;
}

/**
 * Premium styled tab trigger with icon, count badge, and animated underline
 *
 * Provides a consistent, polished tab design with:
 * - Icon support with hover animations
 * - Count badges with color variants
 * - Animated underline indicator
 * - Responsive mobile/desktop labels
 *
 * @example
 * ```tsx
 * <PremiumTabsTrigger
 *   value="completed"
 *   icon={Video}
 *   count={5}
 *   mobileLabel="Done"
 * >
 *   Completed
 * </PremiumTabsTrigger>
 * ```
 */
export function PremiumTabsTrigger({
  icon: Icon,
  count,
  badgeVariant = "default",
  mobileLabel,
  showUnderline = true,
  className,
  children,
  ...props
}: PremiumTabsTriggerProps) {
  const badgeColors = {
    default: "bg-primary/10 text-primary group-hover:bg-primary/20 data-[state=active]:bg-primary/20",
    danger: "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 group-hover:bg-red-500/20 data-[state=active]:bg-red-500/20",
  };

  const underlineColors = {
    default: "bg-primary",
    danger: "bg-red-600 dark:bg-red-500",
  };

  return (
    <TabsTrigger
      className={cn(
        // Base layout
        "group relative flex items-center justify-center gap-2 flex-1",
        "whitespace-nowrap rounded-t-lg",
        "px-4 sm:px-5 py-2.5",
        "text-sm font-medium",
        // Transitions
        "transition-all duration-200",
        // Focus styles
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // State styles
        "data-[state=active]:text-foreground data-[state=active]:bg-transparent",
        "data-[state=inactive]:text-muted-foreground",
        "data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50",
        // Disabled styles
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
      )}
      
      {/* Desktop label */}
      {children && (
        <span className="hidden sm:inline">{children}</span>
      )}
      
      {/* Mobile label */}
      {mobileLabel && (
        <span className="sm:hidden">{mobileLabel}</span>
      )}
      
      {/* Count badge */}
      {count !== undefined && (
        <span
          className={cn(
            "ml-1.5 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors",
            badgeColors[badgeVariant]
          )}
        >
          {count}
        </span>
      )}
      
      {/* Animated underline */}
      {showUnderline && (
        <span
          className={cn(
            "absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full",
            "scale-x-0 data-[state=active]:scale-x-100",
            "transition-transform duration-200 origin-center",
            underlineColors[badgeVariant]
          )}
        />
      )}
    </TabsTrigger>
  );
}

