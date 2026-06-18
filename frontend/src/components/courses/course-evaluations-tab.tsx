"use client";

import { MessageSquare, Star } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RatingDisplay } from "@/components/common/rating-display";
import { useGetBatchReviewsAdmin } from "@/hooks";
import type { BatchReview } from "./types";
import { cn } from "@/lib/utils";

interface CourseEvaluationsTabProps {
  courseId: string;
}

export function CourseEvaluationsTab({
  courseId,
}: CourseEvaluationsTabProps) {
  const { data, isLoading } = useGetBatchReviewsAdmin(courseId);
  const reviews = (data?.data?.reviews || []) as BatchReview[];
  const averageRating = data?.data?.averageRating || 0;
  const ratingCount = data?.data?.ratingCount || 0;
  const reviewCount = data?.data?.reviewCount || 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
          Loading evaluations...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <RatingDisplay
        rating={averageRating}
        totalRatings={ratingCount}
        totalReviews={reviewCount}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Student Evaluations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No students have submitted an evaluation for this course yet.
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-xl border border-border/70 bg-background p-4"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={review.user?.profileImg || undefined}
                      alt={review.user?.username || "Student"}
                    />
                    <AvatarFallback>
                      {(review.user?.username || "Student")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-foreground">
                          {review.user?.username || "Student"}
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              key={index}
                              className={cn(
                                "h-3.5 w-3.5",
                                index < review.rating
                                  ? "fill-amber-500 text-amber-500"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {new Date(review.updatedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                      {review.comment?.trim() || "No written comment provided."}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
