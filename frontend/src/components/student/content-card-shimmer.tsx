"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shimmer loading component for content cards
 * Matches the structure of ContentCard for consistent loading states
 */
export function ContentCardShimmer() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Thumbnail/Icon Skeleton */}
          <div className="relative w-full sm:w-48 h-32 sm:h-auto bg-muted shrink-0">
            <Skeleton className="h-full w-full" />
          </div>

          {/* Content Skeleton */}
          <div className="flex-1 p-4 sm:p-6 space-y-3">
            {/* Title and Badge */}
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            {/* Duration/Type */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Grid of content card shimmers
 */
export function ContentCardShimmerGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <ContentCardShimmer key={index} />
      ))}
    </div>
  );
}

