"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Award, CheckCircle2, XCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/date";
import { RecentCompletedAttempt } from "@/lib/types/api";
import { cn } from "@/lib/utils";

interface RecentCompletedTestCardProps {
  attempt: RecentCompletedAttempt;
  index?: number;
}

export function RecentCompletedTestCard({
  attempt,
  index = 0,
}: RecentCompletedTestCardProps) {
  const {
    id,
    test,
    totalScore,
    percentage,
    rank,
    percentile,
    isPassed,
    correctCount,
    wrongCount,
    skippedCount,
    timeSpentSeconds,
    submittedAt,
  } = attempt;

  const totalQuestions = correctCount + wrongCount + skippedCount;
  const accuracy =
    totalQuestions > 0
      ? ((correctCount / totalQuestions) * 100).toFixed(1)
      : "0.0";

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-2">
                {test.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {test.testSeries?.title || "Test Series"}
                {test.testSeries?.exam && ` • ${test.testSeries.exam}`}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {percentile !== null && (
                <Badge
                  variant="secondary"
                  className="bg-linear-to-r from-primary to-primary/80 text-primary-foreground"
                >
                  <Award className="h-3 w-3 mr-1" />
                  {percentile.toFixed(1)}%ile
                </Badge>
              )}
              <Badge
                variant={isPassed ? "default" : "destructive"}
                className={cn(
                  "flex items-center gap-1",
                  isPassed
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                )}
              >
                {isPassed ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {isPassed ? "Passed" : "Failed"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Section */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Score</p>
              <p className="text-2xl font-bold text-primary">
                {totalScore.toFixed(1)}
                <span className="text-sm text-muted-foreground font-normal">
                  /{test.totalMarks}
                </span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Percentage</p>
              <p className="text-2xl font-bold">{percentage.toFixed(1)}%</p>
            </div>
            {rank !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Rank</p>
                <p className="text-2xl font-bold">#{rank}</p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Questions</p>
              <p className="font-semibold">{totalQuestions} total</p>
              <p className="text-xs text-muted-foreground mt-1">
                {correctCount} correct • {wrongCount} wrong • {skippedCount}{" "}
                skipped
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
              <p className="font-semibold text-green-600">{accuracy}%</p>
            </div>
          </div>

          {/* Time Spent */}
          {timeSpentSeconds > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Time spent: {formatTime(timeSpentSeconds)}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {submittedAt ? formatDate(new Date(submittedAt)) : "N/A"}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/student/tests/${test.id}/results?attemptId=${id}`}>
                View Results
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
