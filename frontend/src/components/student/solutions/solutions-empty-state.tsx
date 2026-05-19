"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, XCircle } from "lucide-react";
import Link from "next/link";

interface SolutionsEmptyStateProps {
  testId: string;
  error?: Error | null;
  attemptsCount?: number;
}

export function SolutionsEmptyState({
  testId,
  error,
  attemptsCount = 0,
}: SolutionsEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        {error ? (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground mb-4">
              Failed to load solutions. Please try again.
            </p>
          </>
        ) : (
          <>
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {attemptsCount === 0
                ? "You haven't attempted this test yet. Complete the test to view solutions."
                : "Solutions not available yet. They will be available after the test submission period."}
            </p>
          </>
        )}
        <div className="flex gap-4 justify-center">
          {attemptsCount === 0 && (
            <Button asChild>
              <Link href={`/student/tests/${testId}/instructions`}>
                Start Test
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/student/my-learning">Go to My Learning</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

