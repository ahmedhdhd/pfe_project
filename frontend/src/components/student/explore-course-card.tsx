"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  ArrowRight,
} from "@/components/icons";
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
import { useRouter } from "next/navigation";

export type CourseType = "batch";

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
}: BaseCourseCardProps) {
  const router = useRouter();
  const currency = useOrgCurrency();
  const paymentMode = useOrgPaymentMode();
  const showCoursePricing = paymentMode === "per_course";

  const finalPrice = Math.round(totalPrice * (1 - discountPercentage / 100));

  // Display teachers if provided (max 4)
  const displayTeachers = teachers.slice(0, 4);

  // Determine detail URL and button text
  const detailUrl = `/student/batches/${id}`;
  const buttonText = "View Details";

  const handlePayment = () => {
    router.push(detailUrl);
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-primary/50" />
            <span>
              {[className ? `Class ${className}` : null, exam]
                .filter(Boolean)
                .join(" · ") || "Self-paced"}
            </span>
          </div>
        </div>

        {/* ── Pricing + CTA ── */}
        <div className="pt-3 mt-auto border-t border-border/40 space-y-3">
          {/* Price */}
          {showCoursePricing && (
          <div>
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
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1 h-10 font-medium text-sm rounded-xl"
              onClick={handlePayment}
            >
              {buttonText}
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
