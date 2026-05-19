"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBatchReview } from "@/hooks";
import { RatingDisplay } from "@/components/common/rating-display";
import type { BatchReview } from "@/components/courses/types";
import { cn } from "@/lib/utils";

interface CourseEvaluationsSectionProps {
  batchId: string;
  canReview: boolean;
  averageRating?: number;
  ratingCount?: number;
  reviewCount?: number;
  reviews?: BatchReview[];
  viewerReview?: BatchReview | null;
  readOnly?: boolean;
  embedded?: boolean;
  showSummary?: boolean;
}

export function CourseEvaluationsSection({
  batchId,
  canReview,
  averageRating = 0,
  ratingCount = 0,
  reviewCount = 0,
  reviews = [],
  viewerReview = null,
  readOnly = false,
  embedded = false,
  showSummary = true,
}: CourseEvaluationsSectionProps) {
  const createReviewMutation = useCreateBatchReview();
  const [selectedRating, setSelectedRating] = useState<number>(
    viewerReview?.rating || 0
  );
  const [comment, setComment] = useState(viewerReview?.comment || "");

  useEffect(() => {
    setSelectedRating(viewerReview?.rating || 0);
    setComment(viewerReview?.comment || "");
  }, [viewerReview]);

  const reviewsWithComments = useMemo(
    () => reviews.filter((review) => review.comment?.trim()),
    [reviews]
  );

  const handleSubmit = () => {
    if (!selectedRating) {
      toast.error("Choose a rating before saving your evaluation.");
      return;
    }

    createReviewMutation.mutate(
      {
        batchId,
        rating: selectedRating,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            viewerReview
              ? "Your evaluation was updated."
              : "Thanks for sharing your evaluation."
          );
        },
        onError: (error) => {
          const message =
            error && typeof error === "object" && "response" in error
              ? (
                  error.response as {
                    data?: { message?: string };
                  }
                )?.data?.message
              : undefined;

          toast.error(message || "Unable to save your evaluation right now.");
        },
      }
    );
  };

  const content = (
    <>
      {showSummary ? (
        <RatingDisplay
          rating={averageRating}
          totalRatings={ratingCount}
          totalReviews={reviewCount}
        />
      ) : null}

      {!readOnly ? (
        canReview ? (
          <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
            <div className="text-sm font-semibold text-foreground">
              {viewerReview ? "Update your evaluation" : "Leave your evaluation"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Rate this course and share a short comment to help other students.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSelectedRating(value)}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
                      value <= selectedRating
                        ? "border-amber-400 bg-amber-50 text-amber-500"
                        : "border-border bg-background text-muted-foreground hover:border-amber-300 hover:text-amber-500"
                    )}
                    aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={cn(
                        "h-5 w-5",
                        value <= selectedRating && "fill-current"
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Share what you liked, what could improve, or how the course helped you."
                className="min-h-28 resize-y bg-background"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={createReviewMutation.isPending || selectedRating === 0}
              >
                <Send className="mr-2 h-4 w-4" />
                {createReviewMutation.isPending
                  ? "Saving..."
                  : viewerReview
                  ? "Update Evaluation"
                  : "Submit Evaluation"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Enroll in this course to leave your own evaluation.
          </div>
        )
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Student Feedback
          </h3>
          <span className="text-xs text-muted-foreground">
            {reviewsWithComments.length} written{" "}
            {reviewsWithComments.length === 1 ? "review" : "reviews"}
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
            No evaluations yet. The first student review will appear here.
          </div>
        ) : reviewsWithComments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-center text-sm text-muted-foreground">
            Students have rated this course, but no written comments have been
            shared yet.
          </div>
        ) : (
          reviewsWithComments.map((review) => (
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
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Course Evaluations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{content}</CardContent>
    </Card>
  );
}
