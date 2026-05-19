"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function DescriptionPageShimmer() {
  return (
    <div className="container max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Make header skeleton */}
        <div className="mb-4 p-2 bg-card border-b pb-4 lg:col-span-3 shadow-sm rounded-lg">
          <Skeleton className="h-40 w-full" />
        </div>
        {/* Left: Description & Features */}
        <div className="lg:col-span-2 space-y-6">
          {/* About This Batch Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-40" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>

          {/* Key Features Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-40" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                  >
                    <Skeleton className="h-10 w-10 mt-0.5 shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-2/3" />
                      <Skeleton className="h-6 w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Right: Price Card */}
        <div className="lg:col-span-1">
          <Card className="shadow-xl border-2">
            <CardContent className="p-6 space-y-6">
              {/* Image Placeholder */}
              <div className="relative aspect-video rounded-xl overflow-hidden border-2">
                <Skeleton className="h-full w-full" />
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-baseline gap-2">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>

              <Separator />

              {/* Action Button */}
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
              </div>

              <Separator />

              {/* Benefits List */}
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
