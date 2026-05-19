"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ArrowRight,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrgCurrency, useOrgPaymentMode } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";
import { useTestSeriesFlouciPayment } from "@/hooks/use-test-series-payment";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type CourseType = "batch" | "test-series";

interface BaseCourseCardProps {
  id: string;
  title: string;
  exam?: string;
  category?: string;
  totalPrice: number;
  discountPercentage: number;
  type: CourseType;
  imageUrl?: string;
  teachers?: Array<{ id: string; name: string; imageUrl?: string }>;
  isCombo?: boolean;
  planType?: string;
  index?: number;
  // Batch specific
  class?: "11" | "12" | "12+" | "Grad" | string;
  startDate?: Date | string;
  endDate?: Date | string;
  language?: string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | string;
  // Test series specific
  isFree?: boolean;
  durationDays?: number;
}

export function ExploreCourseCard({
  id,
  title,
  exam,
  category,
  totalPrice,
  discountPercentage,
  type,
  imageUrl,
  teachers = [],
  index = 0,
  class: className,
  language,
  level,
  isFree = false,
  durationDays,
}: BaseCourseCardProps) {
  const router = useRouter();
  const currency = useOrgCurrency();
  const paymentMode = useOrgPaymentMode();
  const showCoursePricing = type === "test-series" || paymentMode === "per_course";
  const {
    initializePayment: initializeTestSeriesPayment,
    isLoading: isTestSeriesLoading,
  } = useTestSeriesFlouciPayment();

  const finalPrice =
    type === "test-series" && isFree
      ? 0
      : Math.round(totalPrice * (1 - discountPercentage / 100));
  const isProcessing =
    type === "test-series" && isTestSeriesLoading;

  // Display teachers if provided (max 4)
  const displayTeachers = teachers.slice(0, 4);

  // Determine detail URL and button text
  const detailUrl =
    type === "batch" ? `/student/batches/${id}` : `/student/test-series/${id}`;
  const buttonText =
    type === "batch"
      ? "View Details"
      : type === "test-series" && isFree
      ? "Enroll Free"
      : "Buy Now";

  // Handle payment for batch and test series
  const handlePayment = () => {
    if (type === "batch") {
      router.push(detailUrl);
      return;
    } else if (type === "test-series") {
      if (isFree) {
        router.push(detailUrl);
      } else {
        toast.loading("Initializing payment...");
        initializeTestSeriesPayment(id, (error) => {
          toast.dismiss();
          console.error("Payment failed:", error);
          const errorMessage =
            (error && typeof error === "object" && "response" in error
              ? (error.response as { data?: { message?: string } })?.data
                  ?.message
              : null) ||
            (error instanceof Error ? error.message : null) ||
            "Payment failed. Please try again or contact support.";
          toast.error("Payment failed", {
            description: errorMessage,
            duration: 5000,
          });
        });
      }
    }
  };

  return (
    <Card className="group h-full flex flex-col overflow-hidden border border-border/60 hover:border-primary/40 transition-all duration-200 rounded-xl bg-card p-0 gap-0 hover-lift">
      {/* ── Thumbnail ── */}
      <div className="relative h-44 overflow-hidden bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            priority={index < 3}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/5">
            <BookOpen className="h-12 w-12 text-primary/20" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {type === "test-series" && isFree && (
            <Badge className="bg-primary text-primary-foreground text-xs shadow-sm">
              Free
            </Badge>
          )}
        </div>

        {/* Instructor Avatars */}
        {displayTeachers.length > 0 && (
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center -space-x-2">
              {displayTeachers.map((teacher) => (
                <Avatar
                  key={teacher.id}
                  className="h-7 w-7 border-2 border-background shadow-sm"
                >
                  <AvatarImage src={teacher.imageUrl} alt={teacher.name} />
                  <AvatarFallback className="text-[10px] bg-card text-muted-foreground">
                    {teacher.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <CardContent className="flex-1 flex flex-col p-4 space-y-3">
        {/* Category */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[11px] font-medium bg-primary/10 text-primary border-0"
          >
            {category || exam || "Course"}
          </Badge>
          {language && (
            <Badge
              variant="outline"
              className="text-[11px] text-muted-foreground"
            >
              {language.toUpperCase()}
            </Badge>
          )}
          {level && type === "batch" ? (
            <Badge
              variant="outline"
              className="text-[11px] text-muted-foreground"
            >
              {String(level).replace("_", " ")}
            </Badge>
          ) : null}
        </div>

        {/* Title */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {title}
              </h3>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Info Row */}
        <div className="space-y-1.5">
          {type === "batch" ? (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 text-primary/50" />
                <span>
                  {[className ? `Class ${className}` : null, exam]
                    .filter(Boolean)
                    .join(" · ") || "Self-paced"}
                </span>
              </div>
              </>
            ) : (
            durationDays && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary/50" />
                <span>Valid for {durationDays} days</span>
              </div>
            )
          )}
        </div>

        {/* ── Pricing + CTA ── */}
        <div className="pt-3 mt-auto border-t border-border/40 space-y-3">
          {/* Price */}
          {showCoursePricing && (
          <div>
            {type === "test-series" && isFree ? (
              <span className="text-xl font-bold text-primary">
                Free
              </span>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(finalPrice, currency)}
                </span>
                {discountPercentage > 0 && (
                  <>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(totalPrice, currency)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-primary/10 text-primary font-semibold"
                    >
                      {discountPercentage}% OFF
                    </Badge>
                  </>
                )}
              </div>
            )}
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1 h-10 font-medium text-sm rounded-xl"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                buttonText
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0"
              asChild
            >
              <Link href={detailUrl}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
