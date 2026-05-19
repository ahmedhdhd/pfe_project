"use client";

import { useSearchParams, useParams } from "next/navigation";
import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  useAttemptSolutions,
  useMyAttemptsByTest,
} from "@/hooks/test-attempts-client";
import {
  QuestionSolutionCard,
  SolutionsLoadingSkeleton,
  SolutionsEmptyState,
  type SolutionAnswer,
} from "@/components/student/solutions";

export default function TestSolutionsPage() {
  const params = useParams<{ testId: string }>();
  const searchParams = useSearchParams();
  const attemptIdFromQuery = searchParams.get("attemptId") || undefined;
  const testId = params.testId;

  // Fetch user's attempts for this test to get latest attempt if attemptId not provided
  const { data: attemptsData, isLoading: isLoadingAttempts } =
    useMyAttemptsByTest(testId);
  const attempts = attemptsData?.data || [];

  // Get latest completed attempt if attemptId not provided
  const latestAttempt = useMemo(() => {
    if (attemptIdFromQuery) return null; // If attemptId provided, don't need to find latest
    const completedAttempts = attempts.filter(
      (a) => a.isCompleted && a.submittedAt
    );
    if (completedAttempts.length === 0) return null;
    // Sort by submittedAt descending to get latest
    return completedAttempts.sort(
      (a, b) =>
        new Date(b.submittedAt || 0).getTime() -
        new Date(a.submittedAt || 0).getTime()
    )[0];
  }, [attempts, attemptIdFromQuery]);

  // Use provided attemptId or latest attempt's id
  const attemptId = attemptIdFromQuery || latestAttempt?.id;

  // Hooks must be called unconditionally - use enabled option to conditionally fetch
  const {
    data: solutionsData,
    isLoading: isLoadingSolutions,
    error,
  } = useAttemptSolutions(attemptId);

  const isLoading = isLoadingAttempts || isLoadingSolutions;

  // Validate testId after hooks are called
  if (!testId) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Solutions"
            description="View solutions and explanations for all questions"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Invalid test ID. Please select a test to view solutions.
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

  // Show loading while fetching attempts
  if (isLoadingAttempts && !attemptIdFromQuery) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Solutions"
            description="View solutions and explanations for all questions"
          />
          <SolutionsLoadingSkeleton count={2} />
        </div>
      </div>
    );
  }

  // If no attemptId and no completed attempts found
  if (!attemptId) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Solutions"
            description="View solutions and explanations for all questions"
          />
          <SolutionsEmptyState
            testId={testId}
            attemptsCount={attempts.length}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Solutions"
            description="View solutions and explanations for all questions"
          />
          <SolutionsLoadingSkeleton count={3} />
        </div>
      </div>
    );
  }

  if (error || !solutionsData?.data) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Solutions"
            description="View solutions and explanations for all questions"
          />
          <SolutionsEmptyState
            testId={testId}
            error={error as Error | null}
            attemptsCount={attempts.length}
          />
        </div>
      </div>
    );
  }

  // Type assertion for solutions data structure
  // The API returns an array of answer objects, each containing question and answer data
  const solutions = (solutionsData?.data as SolutionAnswer[]) || [];

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
      <StudentHeader />
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
        <PageHeader
          title="Test Solutions"
          description="View solutions and explanations for all questions"
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Solutions & Explanations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {Array.isArray(solutions) && solutions.length > 0 ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    Total Questions: {solutions.length}
                  </div>
                  {solutions.map((answer: SolutionAnswer, index: number) => (
                    <QuestionSolutionCard
                      key={answer.id || answer.question.id || index}
                      answer={answer}
                      index={index}
                    />
                  ))}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No solutions available at this time.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" asChild className="flex-1">
            <Link
              href={`/student/tests/${testId}/results?attemptId=${attemptId}`}
            >
              View Results
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link href="/student/my-learning">Back to My Learning</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
