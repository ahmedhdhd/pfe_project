"use client";

import { motion } from "framer-motion";
import { Calendar, GraduationCap, Sparkles, Tag } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOrgPaymentMode } from "@/lib/store/organization-config";

interface MobileBatchHeroProps {
  batch: {
    name: string;
    class?: "11" | "12" | "12+" | "Grad" | string;
    exam?: string;
    category?: {
      id: string;
      name: string;
    } | null;
    imageUrl?: string;
    language: string;
    startDate: Date | string;
    endDate: Date | string;
    discountPercentage: number;
    isPurchased?: boolean;
  };
  isHotDeal: boolean;
  onBack: () => void;
}

export function MobileBatchHero({
  batch,
  isHotDeal,
  onBack,
}: MobileBatchHeroProps) {
  const showCoursePricing = useOrgPaymentMode() === "per_course";
  const startDate = new Date(batch.startDate);

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
          className="relative aspect-video sm:aspect-21/9 overflow-hidden shadow-sm mb-2.5 max-h-[160px] border-y"
        >
          {batch.imageUrl ? (
            <img
              src={batch.imageUrl}
              alt={batch.name}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-linear-to-br from-primary/20 to-primary/10">
              <GraduationCap className="h-16 w-16 text-muted-foreground/40" />
            </div>
          )}

          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {showCoursePricing && isHotDeal && (
              <Badge className="bg-linear-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md text-xs px-2 py-0.5">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                Hot Deal
              </Badge>
            )}
          </div>

          {/* Discount Badge - Smaller and positioned better */}
          {showCoursePricing && batch.discountPercentage > 0 && !batch.isPurchased && (
            <div className="absolute top-2 right-2">
              <div className="bg-red-500 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-md">
                {batch.discountPercentage}% OFF
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
            {batch.name}
          </h1>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {batch.category?.name && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <Tag className="mr-1 h-3 w-3" />
                  {batch.category.name}
                </Badge>
              )}
              {batch.class && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {batch.class}
                </Badge>
              )}
              {batch.exam && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {batch.exam}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {startDate.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
