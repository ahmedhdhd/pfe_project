"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  RotateCcw,
} from "lucide-react";
import { QuestionRenderer } from "@/components/test-engine/question-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubmitTopicQuizAttempt } from "@/hooks";
import type { TopicQuiz, TopicQuizAttemptSummary } from "@/hooks/api";

interface TopicQuizPanelProps {
  topicId: string;
  topicName: string;
  quiz?: TopicQuiz | null;
  latestAttempt?: TopicQuizAttemptSummary | null;
  onQuizAttemptStateChange?: (state: {
    hasCompletedQuiz: boolean;
    isAttemptInProgress: boolean;
  }) => void;
}

export function TopicQuizPanel({
  topicId,
  topicName,
  quiz,
  latestAttempt,
  onQuizAttemptStateChange,
}: TopicQuizPanelProps) {
  const submitAttemptMutation = useSubmitTopicQuizAttempt();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const latestResult =
    (submitAttemptMutation.data?.data?.attempt as TopicQuizAttemptSummary | undefined) ||
    latestAttempt ||
    null;

  const questionCount = quiz?.questions.length || 0;
  const answeredCount = useMemo(
    () =>
      Object.values(answers).filter(
        (value) => value !== undefined && value !== null && String(value).trim() !== ""
      ).length,
    [answers]
  );

  if (!quiz || questionCount === 0) {
    return null;
  }

  const notifyQuizState = (
    hasCompletedQuiz: boolean,
    isAttemptInProgress: boolean
  ) => {
    onQuizAttemptStateChange?.({
      hasCompletedQuiz,
      isAttemptInProgress,
    });
  };

  useEffect(() => {
    notifyQuizState(Boolean(latestResult), hasStarted);
  }, [latestResult, hasStarted]);

  const handleStart = () => {
    setAnswers({});
    setHasStarted(true);
    setCurrentQuestionIndex(0);
    notifyQuizState(Boolean(latestResult), true);
  };

  const handleSubmit = async () => {
    try {
      const response = await submitAttemptMutation.mutateAsync({ topicId, answers });
      const submittedAttempt =
        (response?.data?.attempt as TopicQuizAttemptSummary | undefined) || null;
      setHasStarted(false);
      setCurrentQuestionIndex(0);
      notifyQuizState(Boolean(submittedAttempt || latestResult), false);
    } catch (error) {
      console.error("Failed to submit topic quiz:", error);
    }
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questionCount - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div
      id="topic-quiz-panel"
      className="max-h-[620px] overflow-y-auto border-t bg-muted/10 px-5 py-5"
    >
      <div className="mx-auto w-full max-w-5xl space-y-4 pr-2">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">
                {quiz.title || `${topicName} Quiz`}
              </h2>
              <Badge variant="secondary">{questionCount} questions</Badge>
              <Badge variant="outline">Pass at {quiz.passingPercentage}%</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {quiz.description?.trim() ||
                "Quickly check understanding before moving to the next concept."}
            </p>
          </div>

          {latestResult ? (
            <div className="rounded-xl border bg-background px-4 py-3 text-sm">
              <div className="font-medium">Latest attempt</div>
              <div className="mt-1 text-muted-foreground">
                Score {latestResult.correctCount}/{latestResult.totalQuestions} •{" "}
                {latestResult.percentage.toFixed(1)}%
              </div>
              <div className="mt-1">
                {latestResult.isPassed ? (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Passed
                  </Badge>
                ) : (
                  <Badge variant="destructive">Needs another try</Badge>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {!hasStarted ? (
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleStart}>
              {latestResult ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retake Quiz
                </>
              ) : (
                <>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Start Quiz
                </>
              )}
            </Button>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-lg">Quiz Attempt</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    Question {currentQuestionIndex + 1} of {questionCount}
                  </Badge>
                  <Badge variant="outline">
                    {answeredCount}/{questionCount} answered
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border bg-muted/10 p-4">
                <QuestionRenderer
                  key={currentQuestion.id}
                  question={{
                    id: currentQuestion.id,
                    text: currentQuestion.text,
                    type: currentQuestion.type,
                    options: currentQuestion.options,
                  }}
                  value={answers[currentQuestion.id]}
                  onChange={(value) =>
                    setAnswers((current) => ({
                      ...current,
                      [currentQuestion.id]: value,
                    }))
                  }
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setCurrentQuestionIndex((current) => Math.max(0, current - 1))
                    }
                    disabled={isFirstQuestion}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  {!isLastQuestion ? (
                    <Button
                      type="button"
                      onClick={() =>
                        setCurrentQuestionIndex((current) =>
                          Math.min(questionCount - 1, current + 1)
                        )
                      }
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setHasStarted(false);
                    setCurrentQuestionIndex(0);
                    notifyQuizState(Boolean(latestResult), false);
                  }}
                >
                  Cancel
                </Button>
                  {isLastQuestion ? (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitAttemptMutation.isPending}
                    >
                      {submitAttemptMutation.isPending
                        ? "Submitting..."
                        : "Submit Quiz"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
