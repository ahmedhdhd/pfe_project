"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FAQDisplay } from "@/components/common/faq-display";
import { useOrganizationConfigAdmin } from "@/hooks/api";
import { formatCurrency } from "@/lib/utils/format";
import { Batch } from "./types";

interface CourseOverviewTabProps {
  course: Batch;
}

export function CourseOverviewTab({ course }: CourseOverviewTabProps) {
  const { data: configData } = useOrganizationConfigAdmin();
  const currency = configData?.data?.currency || "USD";
  const showCoursePricing =
    (configData?.data?.paymentMode || "per_course") === "per_course";
  const discountedPrice =
    course.totalPrice -
    (course.totalPrice * (course.discountPercentage || 0)) / 100;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">Description</h3>
              <div
                className="course-description prose prose-sm max-w-none text-muted-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html: course.description || "<p>No description available.</p>",
                }}
              />
            </div>

            <div>
              <h3 className="mb-3 font-semibold">Frequently Asked Questions</h3>
              <FAQDisplay
                faqs={course.faq}
                showCard={false}
                title="FAQ"
                emptyMessage="No FAQ available"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Thumbnail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
              {course.imageUrl ? (
                <Image
                  src={course.imageUrl}
                  alt={course.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No course thumbnail uploaded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {showCoursePricing && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground line-through">
                  {formatCurrency(course.totalPrice, currency)}
                </span>
                <span className="text-2xl font-bold">
                  {formatCurrency(discountedPrice, currency)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {course.discountPercentage}% discount
              </span>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
