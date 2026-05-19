"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { LottieAnimation } from "./lottie-animation";

export interface EmptyStateCardProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Lottie animation URL */
  lottieUrl?: string;
  /** Lottie animation data object */
  lottieData?: object;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional className */
  className?: string;
}

/**
 * Reusable empty state card component
 *
 * Displays a centered empty state with:
 * - Large icon or Lottie animation
 * - Title
 * - Description
 *
 * @example
 * ```tsx
 * <EmptyStateCard
 *   icon={BookOpen}
 *   title="No chapters available"
 *   description="Chapters will be available here once they are added."
 * />
 * ```
 *
 * @example
 * ```tsx
 * <EmptyStateCard
 *   lottieUrl="https://lottie.host/embed/..."
 *   title="No batches found"
 *   description="Start exploring courses to get started."
 * />
 * ```
 */
export function EmptyStateCard({
  icon: Icon,
  lottieUrl,
  lottieData,
  title,
  description,
  className,
}: EmptyStateCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-16">
        {lottieUrl || lottieData ? (
          <div className="w-48 h-48 mb-4">
            <LottieAnimation
              animationUrl={lottieUrl}
              animationData={lottieData}
              loop={true}
              autoplay={true}
            />
          </div>
        ) : Icon ? (
          <Icon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        ) : null}
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
