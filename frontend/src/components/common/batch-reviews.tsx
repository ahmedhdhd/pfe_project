"use client";

import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingDisplay } from "@/components/common/rating-display";
import type { BatchReview } from "@/lib/types/api";
import { cn } from "@/lib/utils";

export function BatchReviewsPanel({
  title = "Course Evaluations",
  averageRating,
  ratingCount,
  reviewCount,
  reviews,
  emptyMessage = "No evaluations yet.",
}: {
  title?: string;
  averageRating: number;
  ratingCount: number;
  reviewCount: number;
  reviews: BatchReview[];
  emptyMessage?: string;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RatingDisplay
            rating={averageRating}
            totalRatings={ratingCount}
            totalReviews={reviewCount}
          />

          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-border/60 bg-background p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={review.user?.profileImg || undefined}
                        alt={review.user?.username || "Student"}
                      />
                      <AvatarFallback>
                        {(review.user?.username || "S")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium">
                            {review.user?.username || "Student"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </div>
                        </div>
                        <StarRow rating={review.rating} />
                      </div>
                      {review.comment ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {review.comment}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No written comment.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function BatchReviewForm({
  rating,
  comment,
  isSubmitting,
  onRatingChange,
  onCommentChange,
  onSubmit,
}: {
  rating: number;
  comment: string;
  isSubmitting: boolean;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate This Course</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm font-medium">Your rating</div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => {
              const value = index + 1;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onRatingChange(value)}
                  className="rounded-md p-1 transition-transform hover:scale-105"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      value <= rating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Comment</div>
          <Textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Share what you liked or what can be improved."
            rows={4}
          />
        </div>

        <Button onClick={onSubmit} disabled={isSubmitting || rating < 1}>
          {isSubmitting ? "Saving..." : "Submit Evaluation"}
        </Button>
      </CardContent>
    </Card>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "h-4 w-4",
            index < rating
              ? "fill-amber-500 text-amber-500"
              : "text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}
