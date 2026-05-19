"use client";

import {
  Clock,
  CheckCircle2,
  Play,
  Lock,
  FileText,
  HelpCircle,
  Repeat,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

export interface TestCardProps {
  /**
   * Test ID
   */
  id: string;
  /**
   * Test title
   */
  title: string;
  /**
   * Duration in minutes
   */
  durationMinutes: number;
  /**
   * Total marks
   */
  totalMarks: number;
  /**
   * Whether the test is free
   */
  isFree?: boolean;
  /**
   * Attempt status (optional)
   */
  attemptStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  /**
   * Whether user is enrolled (shows action button)
   */
  isEnrolled?: boolean;
  /**
   * Whether the test is purchased/unlocked
   */
  isPurchased?: boolean;
  /**
   * Link to test instructions/start page
   */
  testLink?: string;
  /**
   * Custom className
   */
  className?: string;
  /**
   * Animation index for staggered animations
   */
  index?: number;
  /**
   * Whether to show internal animation (disable when parent handles animation)
   */
  showAnimation?: boolean;
  /**
   * Whether to show action button
   */
  showAction?: boolean;
  /**
   * Custom action button text
   */
  actionText?: string;
  /**
   * On action click handler
   */
  onActionClick?: () => void;
  /**
   * Number of questions in the test
   */
  questionCount?: number;
  /**
   * Number of attempts made
   */
  attemptCount?: number;
  /**
   * Whether user has attempted this test
   */
  hasAttempted?: boolean;
  /**
   * Number of sections in the test
   */
  sectionCount?: number;
}

/**
 * Common Test Card Component
 *
 * Displays test information in a clean card format with title, duration, and marks.
 * Supports optional free badge, attempt status, and action buttons.
 *
 * @example
 * ```tsx
 * <TestCard
 *   id="test-1"
 *   title="Back to Basic"
 *   durationMinutes={60}
 *   totalMarks={102}
 *   isFree={false}
 *   testLink="/student/tests/test-1/instructions"
 * />
 * ```
 */
export function TestCard({
  id,
  title,
  durationMinutes,
  totalMarks,
  isFree = false,
  attemptStatus,
  isEnrolled = false,
  isPurchased = true,
  testLink,
  className,
  index = 0,
  showAnimation = true,
  showAction = true,
  actionText,
  onActionClick,
  questionCount,
  attemptCount,
  hasAttempted,
  sectionCount,
}: TestCardProps) {
  // Determine if user can reattempt based on hasAttempted
  // If hasAttempted is true and attemptCount > 0, show "Reattempt"
  // The API/instructions page will handle validation if max attempts reached
  const canReattempt =
    hasAttempted &&
    attemptCount !== undefined &&
    attemptCount > 0 &&
    attemptStatus === "COMPLETED";

  const getActionText = () => {
    if (actionText) return actionText;
    // If user has attempted and test allows multiple attempts, show "Reattempt"
    if (canReattempt) return "Reattempt";
    if (attemptStatus === "COMPLETED") return "Review";
    if (attemptStatus === "IN_PROGRESS") return "Resume";
    return "Start";
  };

  const getActionVariant = () => {
    // Reattempt should be primary button, Review should be outline
    if (canReattempt) return "default";
    if (attemptStatus === "COMPLETED") return "outline";
    return "default";
  };

  // Get reattempt link (instructions page)
  const getReattemptLink = () => {
    if (!testLink) return undefined;
    return testLink; // Instructions page for starting new attempt
  };

  // Get review link (solutions page)
  const getReviewLink = () => {
    if (!testLink) return undefined;
    const baseUrl = testLink.split("?")[0]; // Remove query params
    const queryParams = testLink.includes("?") ? testLink.split("?")[1] : "";
    return `${baseUrl.replace("/instructions", "/solutions")}${
      queryParams ? `?${queryParams}` : ""
    }`;
  };

  // For completed tests with reattempt option, link to instructions page
  // For completed tests without reattempt, link to solutions page
  // For in-progress, link to attempt page
  // For not started, link to instructions
  const getTestLink = () => {
    if (!testLink) return undefined;

    if (attemptStatus === "COMPLETED") {
      // Link to solutions page for completed tests (no reattempt available)
      // Solutions page will fetch latest attempt if attemptId is not provided
      return getReviewLink();
    }

    if (attemptStatus === "IN_PROGRESS") {
      // Link to attempt page to resume
      return testLink.replace("/instructions", "/attempt");
    }

    // For not started, use the original instructions link
    return testLink;
  };

  const cardContent = (
    <Card
      className={cn(
        "group relative overflow-hidden bg-card border shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-300",
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/0 group-hover:to-primary/0 transition-all duration-300 pointer-events-none" />

      <CardContent className="relative p-6">
        <div className="flex flex-col gap-4">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-lg leading-tight text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h4>
                {!isPurchased && (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{durationMinutes} min</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{totalMarks} marks</span>
                </div>
                {questionCount !== undefined && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium">
                      {questionCount} questions
                    </span>
                  </div>
                )}
                {sectionCount !== undefined && sectionCount > 1 && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="font-medium">{sectionCount} sections</span>
                  </div>
                )}
                {attemptCount !== undefined && attemptCount > 0 && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Repeat className="h-4 w-4 shrink-0" />
                    <span className="font-medium">
                      {attemptCount} attempt{attemptCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
                {isFree && (
                  <Badge
                    variant="secondary"
                    className="text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    Free
                  </Badge>
                )}
              </div>
            </div>

            {/* Attempt Status Badge */}
            {attemptStatus && (
              <Badge
                variant={
                  attemptStatus === "COMPLETED"
                    ? "default"
                    : attemptStatus === "IN_PROGRESS"
                    ? "secondary"
                    : "outline"
                }
                className={cn(
                  "shrink-0",
                  attemptStatus === "COMPLETED" &&
                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                )}
              >
                {attemptStatus === "COMPLETED" ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </span>
                ) : attemptStatus === "IN_PROGRESS" ? (
                  "In Progress"
                ) : (
                  "Not Started"
                )}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          {showAction && (isEnrolled || testLink) && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t flex-wrap">
              {/* Show both Reattempt and Review buttons if canReattempt */}
              {canReattempt ? (
                <>
                  {getReattemptLink() && (
                    <Button
                      asChild
                      size="sm"
                      variant="default"
                      className="flex-1 sm:flex-none font-semibold min-w-[100px]"
                    >
                      <Link href={getReattemptLink()!}>
                        <Play className="mr-2 h-4 w-4" />
                        Reattempt
                      </Link>
                    </Button>
                  )}
                  {getReviewLink() && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none font-semibold min-w-[100px]"
                    >
                      <Link href={getReviewLink()!}>
                        <Eye className="mr-2 h-4 w-4" />
                        Review
                      </Link>
                    </Button>
                  )}
                </>
              ) : getTestLink() ? (
                <Button
                  asChild
                  size="sm"
                  variant={getActionVariant()}
                  className="w-full sm:w-auto font-semibold"
                >
                  <Link href={getTestLink()!}>
                    {attemptStatus === "COMPLETED" ? (
                      <Eye className="mr-2 h-4 w-4" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    {getActionText()}
                  </Link>
                </Button>
              ) : onActionClick ? (
                <Button
                  size="sm"
                  variant={getActionVariant()}
                  onClick={onActionClick}
                  className="w-full sm:w-auto font-semibold"
                >
                  <Play className="mr-2 h-4 w-4" />
                  {getActionText()}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Only apply internal animation if showAnimation is true and index > 0
  if (showAnimation && index > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        {cardContent}
      </motion.div>
    );
  }

  return cardContent;
}
