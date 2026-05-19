"use client";

import { useSearchParams, useParams, useRouter } from "next/navigation";
import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";
import Link from "next/link";
import { useStartAttempt } from "@/hooks/test-attempts-client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ErrorMessage,
  SuccessMessage,
} from "@/components/common/error-message";
import { useClientTestSeriesDetail } from "@/hooks/test-series-client";
import { useClientPublishedTestDetails } from "@/hooks/tests-client";
import { decodeHtmlEntities } from "@/lib/utils";

export default function TestInstructionsPage() {
  const params = useParams<{ testId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [agreedToInstructions, setAgreedToInstructions] = useState(false);
  const startAttempt = useStartAttempt();

  const mock = searchParams.get("mock") === "1";
  const testId = params.testId;
  const testSeriesId = searchParams.get("testSeriesId");

  // Fetch test details to get instructions
  const { data: testData } = useClientPublishedTestDetails(testId);
  const test = testData?.data;

  // Fetch test series details if testSeriesId is provided
  const { data: testSeriesData } = useClientTestSeriesDetail(
    testSeriesId || ""
  );
  const testSeries = testSeriesData?.data;

  // Validate testId
  if (!testId) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
        <StudentHeader />
        <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
          <PageHeader
            title="Test Instructions"
            description="Please read the instructions carefully before starting your test"
          />
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Invalid test ID. Please select a test to view instructions.
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

  const handleStartTest = async () => {
    setErrorMessage(null);

    // For mock tests, skip API call and go directly to attempt
    if (mock) {
      router.push(`/student/tests/${testId}/attempt?mock=1`);
      return;
    }

    // For real tests, use API
    try {
      const res = await startAttempt.mutateAsync(testId);
      const attemptId = res.data.id;
      router.push(`/student/tests/${testId}/attempt?attemptId=${attemptId}`);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        "Failed to start attempt. Please ensure you are enrolled.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
      <StudentHeader />
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
        {/* Success/Error Messages */}
        {successMessage && (
          <SuccessMessage
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        )}
        {errorMessage && (
          <ErrorMessage
            error={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        <PageHeader
          title="Test Instructions"
          description="Please read the following instructions carefully before starting your test"
        />

        <div className="space-y-6">
          {/* Important Alert */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> Once you start the test, the timer
                will begin immediately. Make sure you have a stable internet
                connection and are in a distraction-free environment.
              </AlertDescription>
            </Alert>
          </motion.div>

          {/* Test Instructions from API */}
          {test?.instructions?.html ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    Test Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none test-instructions"
                    dangerouslySetInnerHTML={{
                      __html: decodeHtmlEntities(test.instructions.html),
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No instructions available for this test.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Agreement Checkbox */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={agreedToInstructions}
                    onCheckedChange={(checked: boolean) =>
                      setAgreedToInstructions(checked)
                    }
                    className="mt-1"
                  />
                  <label
                    htmlFor="agree"
                    className="text-sm font-medium leading-relaxed cursor-pointer"
                  >
                    I have read and understood all the instructions mentioned
                    above. I am ready to begin the test and agree to follow all
                    the guidelines during the examination.
                  </label>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 pt-4"
          >
            <Button
              variant="outline"
              size="lg"
              className="flex-1 sm:flex-initial"
              asChild
            >
              <Link
                href={
                  testSeriesId
                    ? `/student/test-series/${testSeriesId}?tab=tests`
                    : "/student/my-learning"
                }
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Link>
            </Button>
            <Button
              size="lg"
              className="flex-1 font-semibold text-base"
              disabled={
                !agreedToInstructions || (!mock && startAttempt.isPending)
              }
              onClick={handleStartTest}
            >
              {startAttempt.isPending ? (
                <>Processing...</>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  I&apos;m Ready, Start Test
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      <style jsx global>{`
        .dark .test-instructions div[style],
        .dark .test-instructions p[style],
        .dark .test-instructions span[style] {
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
        }
      `}</style>
    </div>
  );
}
