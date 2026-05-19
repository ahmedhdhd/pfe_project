"use client";

import { useParams } from "next/navigation";
import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useClientTestPreview,
  useClientPublishedTestDetails,
} from "@/hooks/tests-client";
import { useMyAttemptsByTest } from "@/hooks/test-attempts-client";
import { TestAttemptsHistory } from "@/components/student/test-attempts-history";
import {
  Loader2,
  Clock,
  FileText,
  Award,
  Play,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function TestPreviewPage() {
  const params = useParams<{ testId: string }>();
  const testId = params.testId;

  // Try preview first (for enrolled users), fallback to published details
  // Hooks must be called unconditionally - use enabled option to conditionally fetch
  const {
    data: previewData,
    isLoading: isLoadingPreview,
    error: previewError,
  } = useClientTestPreview(testId);

  const {
    data: publishedData,
    isLoading: isLoadingPublished,
    error: publishedError,
  } = useClientPublishedTestDetails(testId);

  const { data: attemptsData } = useMyAttemptsByTest(testId);

  const isLoading = isLoadingPreview || isLoadingPublished;
  const testData = previewData?.data || publishedData?.data;
  const attempts = attemptsData?.data || [];
  const hasError = previewError || publishedError;

  // Validate testId after hooks are called
  if (!testId) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Details"
            description="View test information and instructions"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Invalid test ID. Please select a test to view.
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

  if (isLoading) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Details"
            description="View test information and instructions"
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

  if (hasError || !testData) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Details"
            description="View test information and instructions"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {hasError
                  ? "Failed to load test details. Please try again."
                  : "Test not found or not available."}
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

  const totalQuestions =
    testData.sections?.reduce((sum, section) => {
      // Handle both TestPreview (has questions array) and PublishedTestDetails (has questionCount)
      if ("questions" in section) {
        return sum + section.questions.length;
      }
      if ("questionCount" in section) {
        return sum + section.questionCount;
      }
      return sum;
    }, 0) || 0;

  const hasAttempts = attempts.length > 0;
  const latestAttempt = attempts[0];

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
      <StudentHeader />
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
        <PageHeader
          title={testData.title || "Test Details"}
          description="View test information and instructions"
        />

        {/* Test Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Information</span>
              {"isFree" in testData && testData.isFree && (
                <Badge variant="secondary">Free Test</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Duration</div>
                  <div className="font-semibold">
                    {testData.durationMinutes} minutes
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                  <div className="font-semibold">{totalQuestions}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Award className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    Total Marks
                  </div>
                  <div className="font-semibold">
                    {"totalMarks" in testData
                      ? testData.totalMarks || "N/A"
                      : "N/A"}
                  </div>
                </div>
              </div>
            </div>

            {testData.sections && testData.sections.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold mb-3">Sections</h3>
                <div className="space-y-2">
                  {testData.sections.map((section, index) => (
                    <div
                      key={section.id || index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{section.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {"questions" in section
                            ? section.questions.length
                            : "questionCount" in section
                            ? section.questionCount
                            : 0}{" "}
                          questions
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attempt History - Enhanced View */}
        {hasAttempts && (
          <TestAttemptsHistory
            attempts={attempts}
            testId={testId}
            testTitle={testData.title}
          />
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button className="flex-1" size="lg" asChild>
            <Link href={`/student/tests/${testId}/instructions`}>
              <Play className="mr-2 h-5 w-5" />
              {hasAttempts ? "Retake Test" : "Start Test"}
            </Link>
          </Button>
          {hasAttempts && latestAttempt?.isCompleted && (
            <Button variant="outline" className="flex-1" size="lg" asChild>
              <Link
                href={`/student/tests/${testId}/results?attemptId=${latestAttempt.id}`}
              >
                View Latest Results
              </Link>
            </Button>
          )}
          {hasAttempts && (
            <Button variant="outline" className="flex-1" size="lg" asChild>
              <Link href={`/student/tests/${testId}/leaderboard`}>
                View Leaderboard
              </Link>
            </Button>
          )}
        </div>

        <Button variant="outline" asChild className="w-full">
          <Link href="/student/my-learning">Back to My Learning</Link>
        </Button>
      </div>
    </div>
  );
}
