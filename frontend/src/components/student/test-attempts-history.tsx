"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Award,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  FileText,
  Trophy,
  Target,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AttemptSummary } from "@/hooks/test-attempts-client";
import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface TestAttemptsHistoryProps {
  attempts: AttemptSummary[];
  testId: string;
  testTitle?: string;
}

export function TestAttemptsHistory({
  attempts,
  testId,
  testTitle,
}: TestAttemptsHistoryProps) {
  const completedAttempts = attempts.filter((a) => a.isCompleted);
  const inProgressAttempts = attempts.filter((a) => !a.isCompleted);

  // Calculate statistics
  const stats = useMemo(() => {
    if (completedAttempts.length === 0) {
      return {
        bestScore: 0,
        bestPercentage: 0,
        averageScore: 0,
        averagePercentage: 0,
        totalAttempts: attempts.length,
        completedAttempts: 0,
        bestAttempt: null as AttemptSummary | null,
        improvement: 0,
      };
    }

    const scores = completedAttempts.map((a) => a.totalScore || 0);
    const percentages = completedAttempts.map((a) => a.percentage || 0);

    const bestAttempt = completedAttempts.reduce((best, current) => {
      const currentScore = current.totalScore || 0;
      const bestScore = best.totalScore || 0;
      return currentScore > bestScore ? current : best;
    }, completedAttempts[0]);

    const bestScore = Math.max(...scores);
    const bestPercentage = Math.max(...percentages);
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const averagePercentage =
      percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;

    // Calculate improvement (latest vs first)
    const sortedByDate = [...completedAttempts].sort(
      (a, b) =>
        new Date(a.submittedAt || 0).getTime() -
        new Date(b.submittedAt || 0).getTime()
    );
    const improvement =
      sortedByDate.length >= 2
        ? (sortedByDate[sortedByDate.length - 1].totalScore || 0) -
          (sortedByDate[0].totalScore || 0)
        : 0;

    return {
      bestScore,
      bestPercentage,
      averageScore,
      averagePercentage,
      totalAttempts: attempts.length,
      completedAttempts: completedAttempts.length,
      bestAttempt,
      improvement,
    };
  }, [attempts, completedAttempts]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (attempts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Summary */}
      {stats.completedAttempts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs text-muted-foreground">
                      Best Score
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.bestScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.bestPercentage.toFixed(1)}%
                  </div>
                </div>

                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-muted-foreground">
                      Average
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.averageScore.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.averagePercentage.toFixed(1)}%
                  </div>
                </div>

                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">
                      Attempts
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {stats.totalAttempts}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stats.completedAttempts} completed
                  </div>
                </div>

                <div className="text-center p-3 bg-background/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {stats.improvement >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      Improvement
                    </span>
                  </div>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      stats.improvement >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    {stats.improvement >= 0 ? "+" : ""}
                    {stats.improvement.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    vs first attempt
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* In Progress Attempts */}
      {inProgressAttempts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                In Progress ({inProgressAttempts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inProgressAttempts.map((attempt, index) => (
                  <motion.div
                    key={attempt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="font-semibold">
                          Attempt #{attempt.attemptNumber || attempts.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Started {formatDate(attempt.startedAt)}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/student/tests/${testId}/attempt`}>
                        Resume
                      </Link>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Completed Attempts */}
      {completedAttempts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Attempt History ({completedAttempts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedAttempts.map((attempt, index) => {
                  const isBestAttempt =
                    stats.bestAttempt?.id === attempt.id;
                  const isPassed = attempt.isPassed ?? false;
                  const score = attempt.totalScore || 0;
                  const percentage = attempt.percentage || 0;

                  return (
                    <motion.div
                      key={attempt.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={cn(
                        "p-4 border rounded-lg transition-all hover:shadow-md",
                        isBestAttempt
                          ? "border-primary/50 bg-primary/5 dark:bg-primary/10"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center font-bold",
                                isBestAttempt
                                  ? "bg-primary text-primary-foreground"
                                  : isPassed
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {attempt.attemptNumber || index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  Attempt #{attempt.attemptNumber || index + 1}
                                </span>
                                {isBestAttempt && (
                                  <Badge
                                    variant="default"
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                                  >
                                    <Trophy className="h-3 w-3 mr-1" />
                                    Best
                                  </Badge>
                                )}
                                {isPassed && (
                                  <Badge
                                    variant="default"
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Passed
                                  </Badge>
                                )}
                                {!isPassed && attempt.isPassed !== null && (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Failed
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {formatDate(attempt.submittedAt || attempt.startedAt)}
                              </div>
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <Award className="h-4 w-4 text-primary" />
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Score
                                </div>
                                <div className="font-semibold text-sm">
                                  {score.toFixed(1)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <Target className="h-4 w-4 text-blue-600" />
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Percentage
                                </div>
                                <div className="font-semibold text-sm">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Time
                                </div>
                                <div className="font-semibold text-sm">
                                  {attempt.timeSpentSeconds
                                    ? formatTime(attempt.timeSpentSeconds)
                                    : "N/A"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                              <BarChart3 className="h-4 w-4 text-purple-600" />
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  Accuracy
                                </div>
                                <div className="font-semibold text-sm">
                                  {attempt.correctCount !== undefined &&
                                  attempt.wrongCount !== undefined &&
                                  attempt.correctCount + attempt.wrongCount > 0
                                    ? (
                                        (attempt.correctCount /
                                          (attempt.correctCount +
                                            attempt.wrongCount)) *
                                        100
                                      ).toFixed(0)
                                    : "N/A"}
                                  %
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Question Breakdown */}
                          {(attempt.correctCount !== undefined ||
                            attempt.wrongCount !== undefined ||
                            attempt.skippedCount !== undefined) && (
                            <div className="flex items-center gap-4 text-sm pt-2 border-t">
                              {attempt.correctCount !== undefined && (
                                <div className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-muted-foreground">
                                    Correct:{" "}
                                    <span className="font-semibold text-foreground">
                                      {attempt.correctCount}
                                    </span>
                                  </span>
                                </div>
                              )}
                              {attempt.wrongCount !== undefined && (
                                <div className="flex items-center gap-1.5">
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-muted-foreground">
                                    Wrong:{" "}
                                    <span className="font-semibold text-foreground">
                                      {attempt.wrongCount}
                                    </span>
                                  </span>
                                </div>
                              )}
                              {attempt.skippedCount !== undefined &&
                                attempt.skippedCount > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                      Skipped:{" "}
                                      <span className="font-semibold text-foreground">
                                        {attempt.skippedCount}
                                      </span>
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}

                          {/* Rank & Percentile */}
                          {attempt.rank !== null &&
                            attempt.rank !== undefined && (
                              <div className="flex items-center gap-4 text-sm pt-2 border-t">
                                <div className="flex items-center gap-1.5">
                                  <Trophy className="h-4 w-4 text-yellow-600" />
                                  <span className="text-muted-foreground">
                                    Rank:{" "}
                                    <span className="font-semibold text-foreground">
                                      #{attempt.rank}
                                    </span>
                                  </span>
                                </div>
                                {attempt.percentile !== null &&
                                  attempt.percentile !== undefined && (
                                    <div className="flex items-center gap-1.5">
                                      <TrendingUp className="h-4 w-4 text-blue-600" />
                                      <span className="text-muted-foreground">
                                        Percentile:{" "}
                                        <span className="font-semibold text-foreground">
                                          {attempt.percentile.toFixed(1)}%
                                        </span>
                                      </span>
                                    </div>
                                  )}
                              </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            variant={isBestAttempt ? "default" : "outline"}
                            size="sm"
                            asChild
                            className="w-full"
                          >
                            <Link
                              href={`/student/tests/${testId}/results?attemptId=${attempt.id}`}
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Results
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="w-full"
                          >
                            <Link
                              href={`/student/tests/${testId}/solutions?attemptId=${attempt.id}`}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Solutions
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

