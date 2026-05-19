"use client";

import { motion } from "framer-motion";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrgCurrency } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";

interface MobilePricingCardProps {
  originalPrice?: number;
  finalPrice: number;
  savings?: number;
  discountPercentage: number;
  isFree?: boolean;
  isEnrolled?: boolean;
  isProcessing?: boolean;
  isDisabled?: boolean;
  disabledReason?: string;
  onEnrollClick: () => void;
  onSecondaryActionClick?: () => void;
  ctaText?: string;
  secondaryCtaText?: string;
  enrolledText?: string;
  className?: string;
}

export function MobilePricingCard({
  originalPrice,
  finalPrice,
  savings,
  discountPercentage,
  isFree = false,
  isEnrolled = false,
  isProcessing = false,
  isDisabled = false,
  disabledReason,
  onEnrollClick,
  onSecondaryActionClick,
  ctaText = "Enroll Now",
  secondaryCtaText,
  enrolledText = "You are enrolled",
  className = "",
}: MobilePricingCardProps) {
  const currency = useOrgCurrency();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`lg:hidden ${className}`}
    >
      {!isEnrolled && (
        <Card className="shadow-lg border-2">
          <CardContent className="p-4">
            {/* Pricing Section */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                {isFree ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      Free
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(finalPrice, currency)}
                      </span>
                      {discountPercentage > 0 && originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(originalPrice, currency)}
                        </span>
                      )}
                    </div>
                    {savings && savings > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                        Save {formatCurrency(savings, currency)} ({discountPercentage}% OFF)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <div className={secondaryCtaText ? "grid gap-2 sm:grid-cols-2" : ""}>
              {secondaryCtaText && onSecondaryActionClick ? (
                <Button
                  variant="outline"
                  className="h-12 text-base font-semibold"
                  size="lg"
                  onClick={onSecondaryActionClick}
                  disabled={isProcessing || isDisabled}
                >
                  {secondaryCtaText}
                </Button>
              ) : null}
              <Button
                className="w-full h-12 text-base font-semibold shadow-md"
                size="lg"
                onClick={onEnrollClick}
                disabled={isProcessing || isDisabled}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isDisabled ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {disabledReason || "Not Available"}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {ctaText}
                  </>
                )}
              </Button>
            </div>

            {isDisabled && disabledReason && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                {disabledReason}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
