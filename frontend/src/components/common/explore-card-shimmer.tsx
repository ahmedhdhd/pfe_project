"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function ExploreCardShimmer() {
  return (
    <Card className="p-0 h-full flex flex-col overflow-hidden border-2 gap-0">
      {/* Image Section */}
      <div className="relative h-44 sm:h-48 overflow-hidden bg-muted">
        <Skeleton className="h-full w-full" />

        {/* Top Badges Skeleton */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        {/* Discount Badge Skeleton */}
        <div className="absolute top-3 right-3">
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        {/* Badges Section */}
        <div className="flex items-start gap-2 flex-wrap">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Pricing Section */}
        <div className="pt-3 mt-auto border-t space-y-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Skeleton className="h-10 sm:h-11 flex-1 rounded-md" />
            <Skeleton className="h-10 sm:h-11 flex-1 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExploreCardsGridShimmer({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ExploreCardShimmer key={index} />
      ))}
    </div>
  );
}
