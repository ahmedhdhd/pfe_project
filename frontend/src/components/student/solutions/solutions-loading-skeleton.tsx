"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface SolutionsLoadingSkeletonProps {
  count?: number;
}

export function SolutionsLoadingSkeleton({
  count = 3,
}: SolutionsLoadingSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: count }).map((_, index) => (
            <QuestionSolutionSkeleton key={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionSolutionSkeleton() {
  return (
    <div className="p-6 border-2 rounded-xl space-y-6 bg-card">
      {/* Question Header Skeleton */}
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>

      {/* Options Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Your Answer Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="p-4 rounded-lg border-2">
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Correct Answer Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="p-4 rounded-lg border-2">
          <Skeleton className="h-5 w-full mb-2" />
        </div>
      </div>

      <Separator className="my-6" />

      {/* Explanation Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="p-4 rounded-lg border">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Additional Info Skeleton */}
      <div className="flex items-center gap-4 pt-2 border-t">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
