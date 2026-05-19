"use client";

import { motion } from "framer-motion";
import { Star, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RatingDisplayProps {
  rating: number;
  totalRatings?: number;
  totalReviews?: number;
  showDetails?: boolean;
  className?: string;
}

export function RatingDisplay({
  rating,
  totalRatings,
  totalReviews,
  showDetails = true,
  className = "",
}: RatingDisplayProps) {
  // Round to 1 decimal place
  const displayRating = Math.round(rating * 10) / 10;

  // Calculate filled stars
  const fullStars = Math.floor(displayRating);
  const hasHalfStar = displayRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-900/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Rating Score */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {displayRating}
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {/* Full Stars */}
                  {Array.from({ length: fullStars }).map((_, i) => (
                    <Star
                      key={`full-${i}`}
                      className="h-3.5 w-3.5 fill-amber-500 text-amber-500"
                    />
                  ))}
                  {/* Half Star */}
                  {hasHalfStar && (
                    <div className="relative">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      <div className="absolute inset-0 overflow-hidden w-1/2">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      </div>
                    </div>
                  )}
                  {/* Empty Stars */}
                  {Array.from({ length: emptyStars }).map((_, i) => (
                    <Star
                      key={`empty-${i}`}
                      className="h-3.5 w-3.5 text-amber-300 dark:text-amber-700"
                    />
                  ))}
                </div>
              </div>

              {/* Divider */}
              {showDetails && (totalRatings || totalReviews) && (
                <div className="h-12 w-px bg-amber-200 dark:bg-amber-800" />
              )}

              {/* Details */}
              {showDetails && (totalRatings || totalReviews) && (
                <div className="flex flex-col gap-1">
                  {totalRatings !== undefined && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>
                        {totalRatings.toLocaleString()}{" "}
                        {totalRatings === 1 ? "rating" : "ratings"}
                      </span>
                    </div>
                  )}
                  {totalReviews !== undefined && totalReviews > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {totalReviews.toLocaleString()}{" "}
                      {totalReviews === 1 ? "review" : "reviews"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Compact version for inline use
export function CompactRating({
  rating,
  totalRatings,
  className = "",
}: {
  rating: number;
  totalRatings?: number;
  className?: string;
}) {
  const displayRating = Math.round(rating * 10) / 10;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
        <span className="text-sm font-semibold text-foreground">
          {displayRating}
        </span>
      </div>
      {totalRatings !== undefined && (
        <span className="text-xs text-muted-foreground">
          ({totalRatings.toLocaleString()})
        </span>
      )}
    </div>
  );
}

