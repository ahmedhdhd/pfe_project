"use client";

import { motion } from "framer-motion";
import { FileText, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientTestSeriesListItem } from "@/hooks/test-series-client";

interface MobileTestSeriesHeroProps {
  testSeries: ClientTestSeriesListItem;
  testCount: number;
  isHotDeal: boolean;
  onBack: () => void;
  isEnrolled?: boolean;
}

export function MobileTestSeriesHero({
  testSeries,
  testCount,
  isHotDeal,
  onBack,
  isEnrolled = false,
}: MobileTestSeriesHeroProps) {
  return (
    <div className="relative bg-background/95 backdrop-blur-md border-b shadow-sm">
      <div className="relative">
        {/* Back Button - More compact and thumb-friendly */}
        <div className="px-3 pt-2.5">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-2 h-9 px-2 -ml-2"
            size="sm"
          >
            <span className="mr-1.5">←</span>
            Back
          </Button>
        </div>

        {/* Image - Full width on mobile, ultra compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full relative aspect-video sm:aspect-21/9 overflow-hidden shadow-sm mb-2.5 max-h-[160px] border-y"
        >
          {testSeries.imageUrl ? (
            <img
              src={testSeries.imageUrl}
              alt={testSeries.title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-linear-to-br from-primary/20 to-primary/10">
              <FileText className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}

          {/* Status Badge Overlay - Smaller and cleaner */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {testSeries.isFree && (
              <Badge className="bg-emerald-500 text-white border-0 shadow-md text-xs px-2 py-0.5">
                Free
              </Badge>
            )}
            {isHotDeal && (
              <Badge className="bg-linear-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md text-xs px-2 py-0.5">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Hot Deal
              </Badge>
            )}
            {isEnrolled && (
              <Badge className="bg-green-600 text-white border-0 shadow-md text-xs px-2 py-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Enrolled
              </Badge>
            )}
          </div>

          {/* Discount Badge - Smaller and positioned better */}
          {testSeries.discountPercentage > 0 && !isEnrolled && (
            <div className="absolute top-2 right-2">
              <div className="bg-red-500 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-md">
                {testSeries.discountPercentage}% OFF
              </div>
            </div>
          )}
        </motion.div>

        {/* Title & Meta - Ultra compact below image */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="px-3 pb-2.5 space-y-1.5"
        >
          <h1 className="text-base sm:text-lg font-bold leading-tight line-clamp-2 text-foreground">
            {testSeries.title}
          </h1>

          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="text-xs shrink-0">
              {testSeries.exam}
            </Badge>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{testCount}</span>
              {testSeries.durationDays > 0 && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <Clock className="h-3 w-3" />
                  <span>{testSeries.durationDays}d</span>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
