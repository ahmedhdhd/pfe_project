"use client";

import { useSearchParams, useParams } from "next/navigation";
import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAttemptResults } from "@/hooks/test-attempts-client";
import {
  Loader2,
  Trophy,
  TrendingUp,
  Award,
  XCircle,
  FileText,
  CheckCircle2,
  Clock,
  Target,
  BarChart3,
  CheckCircle,
  X,
  Minus,
  Calendar,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

// Extended types for results with test data
type ExtendedAttemptResult = {
  id: string;
  userId: string;
  testId: string;
  attemptNumber?: number;
  startedAt: string;
  submittedAt?: string | null;
  timeSpentSeconds?: number;
  totalScore: number;
  percentage: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  isCompleted: boolean;
  isPassed?: boolean;
  rank?: number;
  percentile?: number;
  test?: {
    id: string;
    title: string;
    description?: {
      html?: string;
      topics?: unknown[];
    };
    totalMarks?: number;
    passingMarks?: number;
    durationMinutes?: number;
    questionCount?: number;
    sections?: Array<{
      id: string;
      name: string;
      description?: string;
      questionCount?: number;
      totalMarks?: number;
    }>;
  };
};

export default function TestResultsPage() {
  const params = useParams<{ testId: string }>();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId") || undefined;
  const testId = params.testId;

  // Hooks must be called unconditionally - use enabled option to conditionally fetch
  const {
    data: resultsData,
    isLoading: isLoadingResults,
    error: resultsError,
  } = useAttemptResults(attemptId);

  // Validate testId after hooks are called
  if (!testId) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Results"
            description="View your test results and performance"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Invalid test ID. Please select a test to view results.
              </p>
              <Button asChild>
                <Link href="/student/my-learning">Go to My Learning</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const results = resultsData?.data;
  const hasResults = Boolean(results);

  if (!attemptId) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Results"
            description="View your test results and performance"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No attempt ID provided. Please access this page from a completed
                test.
              </p>
              <Button asChild>
                <Link href="/student/my-learning">Go to My Learning</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingResults) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Results"
            description="View your test results and performance"
          />
          <Card>
            <CardContent className="py-12">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (resultsError || !hasResults) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Results"
            description="View your test results and performance"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-muted-foreground mb-4">
                {resultsError
                  ? "Failed to load results. Please try again."
                  : "Test not yet submitted or results not available."}
              </p>
              <Button asChild>
                <Link href="/student/my-learning">Go to My Learning</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const testData = resultsData?.data as ExtendedAttemptResult | undefined;
  const test = testData?.test;
  const totalMarks = test?.totalMarks || 0;
  const passingMarks = test?.passingMarks || 0;
  const percentage = results?.percentage || 0;
  const isPassed = testData?.isPassed ?? false;
  const correctCount = testData?.correctCount || 0;
  const wrongCount = testData?.wrongCount || 0;
  const skippedCount = testData?.skippedCount || 0;
  const timeSpentSeconds = testData?.timeSpentSeconds || 0;
  const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
  const timeSpentSecondsRemainder = timeSpentSeconds % 60;
  const durationMinutes = test?.durationMinutes || 60;
  const sections = test?.sections || [];
  const submittedAt = testData?.submittedAt
    ? new Date(testData.submittedAt).toLocaleString()
    : "";
  const startedAt = testData?.startedAt
    ? new Date(testData.startedAt).toLocaleString()
    : "";

  const totalQuestions = correctCount + wrongCount + skippedCount;
  const accuracy =
    totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
      <StudentHeader />
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
        <PageHeader
          title="Test Results"
          description="View your test results and performance"
        />

        {/* Test Info Header */}
        {test && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{test.title}</h2>
                    {test.description?.html && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {test.description.html.replace(/<[^>]*>/g, "")}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={isPassed ? "default" : "destructive"}
                    className="text-sm px-4 py-2"
                  >
                    {isPassed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Passed
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Not Passed
                      </>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="h-full"
          >
            <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Score
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {results?.totalScore?.toFixed(1) || "0"}
                </div>
                <div className="text-xs text-muted-foreground mb-2 min-h-[16px]">
                  out of {totalMarks} marks
                </div>
                {passingMarks > 0 && (
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        Passing Marks
                      </span>
                      <span className="font-semibold">{passingMarks}</span>
                    </div>
                    <Progress
                      value={((results?.totalScore || 0) / totalMarks) * 100}
                      className="h-2"
                    />
                  </div>
                )}
                {!passingMarks && <div className="mt-auto h-[18px]"></div>}
              </CardContent>
            </Card>
          </motion.div>

          {/* Percentage Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Percentage
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {percentage.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mb-2 min-h-[16px]">
                  {isPassed ? (
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      Passed ✓
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      Not Passed
                    </span>
                  )}
                </div>
                <div className="mt-auto">
                  <Progress value={percentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rank Card */}
          {results?.rank !== undefined && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="h-full"
            >
              <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Rank
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">#{results.rank}</div>
                  <div className="text-xs text-muted-foreground mb-2 min-h-[16px]">
                    {results.percentile !== undefined ? (
                      `Top ${results.percentile.toFixed(1)}% percentile`
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </div>
                  <div className="mt-auto h-[18px]"></div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Accuracy Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="h-full"
          >
            <Card className="border shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
              <CardContent className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Accuracy
                  </div>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {accuracy.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground mb-2 min-h-[16px]">
                  {correctCount} correct out of {totalQuestions} answered
                </div>
                <div className="mt-auto">
                  <Progress value={accuracy} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="h-full"
          >
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Question Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {correctCount}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Correct
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900">
                    <X className="h-6 w-6 text-red-600 dark:text-red-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {wrongCount}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Wrong
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted border">
                    <Minus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <div className="text-2xl font-bold">{skippedCount}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Skipped
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t mt-auto">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      Total Questions
                    </span>
                    <span className="font-semibold">
                      {test?.questionCount || totalQuestions}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Answered</span>
                    <span className="font-semibold">
                      {correctCount + wrongCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Time & Attempt Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="h-full"
          >
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Attempt Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col flex-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Time Spent
                      </span>
                    </div>
                    <span className="font-semibold">
                      {timeSpentMinutes}m {timeSpentSecondsRemainder}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Duration
                      </span>
                    </div>
                    <span className="font-semibold">
                      {durationMinutes} minutes
                    </span>
                  </div>
                  {testData?.attemptNumber && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Attempt Number
                        </span>
                      </div>
                      <span className="font-semibold">
                        #{testData.attemptNumber}
                      </span>
                    </div>
                  )}
                  {startedAt && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Started At
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-right max-w-[200px]">
                        {startedAt}
                      </span>
                    </div>
                  )}
                  {submittedAt && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Submitted At
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-right max-w-[200px]">
                        {submittedAt}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Section-wise Breakdown */}
        {sections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Section-wise Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{section.name}</h4>
                          {section.description && (
                            <p className="text-sm text-muted-foreground">
                              {section.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {section.questionCount} questions
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Total Marks: {section.totalMarks}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Percentile Info */}
        {results?.percentile !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Performance Ranking</h3>
                    <p className="text-sm text-muted-foreground">
                      You scored better than{" "}
                      <span className="font-bold text-primary">
                        {results.percentile.toFixed(1)}%
                      </span>{" "}
                      of test takers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button variant="outline" asChild className="flex-1">
            <Link
              href={`/student/tests/${testId}/solutions?attemptId=${attemptId}`}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Solutions
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href={`/student/tests/${testId}/leaderboard`}>
              <Award className="mr-2 h-4 w-4" />
              View Leaderboard
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/student/my-learning">Back to My Learning</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
