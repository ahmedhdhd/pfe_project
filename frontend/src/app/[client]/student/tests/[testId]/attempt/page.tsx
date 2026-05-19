"use client";

import { useParams, useSearchParams } from "next/navigation";
import { TestEngine } from "@/components/test-engine/test-engine";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import Link from "next/link";

export default function TestAttemptPage() {
  const params = useParams<{ testId: string }>();
  const searchParams = useSearchParams();
  const testId = params.testId;
  const attemptId = searchParams.get("attemptId") || undefined;
  const mock = searchParams.get("mock") === "1";

  // Validate testId
  if (!testId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Invalid test ID. Please select a test to attempt.
            </p>
            <Button asChild>
              <Link href="/student/my-learning">Go to My Learning</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For real tests, validate attemptId is provided
  if (!mock && !attemptId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No attempt ID provided. Please start the test from the
              instructions page.
            </p>
            <Button asChild>
              <Link href={`/student/tests/${testId}/instructions`}>
                Go to Instructions
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TestEngine testId={testId} attemptId={attemptId} enableMock={mock} />;
}
