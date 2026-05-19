"use client";

import { cn } from "@/lib/utils";

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: "sm" | "md" | "lg";
  /** Optional className */
  className?: string;
  /** Optional text to display below spinner */
  text?: string;
  /** Minimum height for the container */
  minHeight?: string;
}

/**
 * Reusable loading spinner component
 *
 * Displays a centered loading spinner with optional text
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" text="Loading chapters..." />
 * ```
 */
export function LoadingSpinner({
  size = "md",
  className,
  text,
  minHeight = "min-h-[60vh]",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        minHeight,
        className
      )}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-b-2 border-primary",
          sizeClasses[size]
        )}
      />
      {text && <p className="mt-4 text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
