"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { QuestionRenderer } from "./question-renderer";
import { useRouter } from "next/navigation";
import { useAttemptTimer } from "@/hooks/use-attempt-timer";
import { generateMockTest } from "@/lib/utils/test-mock";
import { getAnsweredCount } from "@/lib/utils/test-engine";
import { PremiumTestHeader } from "@/components/test-engine/premium-test-header";
import { PremiumQuestionPalette } from "@/components/test-engine/premium-question-palette";
import { PremiumStatsSidebar } from "@/components/test-engine/premium-stats-sidebar";
import {
  Save,
  CheckCircle2,
  Trophy,
  TrendingUp,
  Clock,
  FileText,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAttemptDetails,
  useSaveAnswer,
  useSubmitAttempt,
  useAttemptResults,
} from "@/hooks/test-attempts-client";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ErrorMessage } from "@/components/common/error-message";
import type { EngineQuestion } from "@/lib/types/test-engine";

export function TestEngine({
  testId,
  attemptId,
  enableMock = false,
}: {
  testId: string;
  attemptId?: string;
  enableMock?: boolean;
}) {
  const [markedForReview, setMarkedForReview] = useState<
    Record<string, boolean>
  >({});
  const [localAnswers, setLocalAnswers] = useState<Record<string, unknown>>({});
  const [answerTimeSpent, setAnswerTimeSpent] = useState<
    Record<string, number>
  >({});
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const router = useRouter();

  // Backend API hooks
  const {
    data: attemptData,
    isLoading: isLoadingAttempt,
    error: attemptError,
  } = useAttemptDetails(attemptId && !enableMock ? attemptId : undefined);

  const saveAnswerMutation = useSaveAnswer();
  const submitMutation = useSubmitAttempt();
  const { data: resultsData, isLoading: isLoadingResults } = useAttemptResults(
    attemptId && !enableMock && submitMutation.isSuccess ? attemptId : undefined
  );

  // Proctoring removed - using minimal security object
  const security = {
    violations: 0,
    maxViolations: 3,
  };

  // Use mock or real data
  const data = useMemo(() => {
    if (enableMock) return generateMockTest();
    if (!attemptData?.data) return null;

    // Define types for API response structure
    type ApiQuestion = {
      id: string;
      text: string;
      imageUrl?: string | null;
      type: string;
      options?: Array<{
        id: string;
        text: string;
        imageUrl?: string | null;
        isCorrect?: boolean;
      }>;
      marks?: number;
      negativeMarks?: number;
      sectionId?: string;
    };

    type ApiSection = {
      id: string;
      name: string;
      questions?: ApiQuestion[];
    };

    type ApiTest = {
      durationMinutes?: number;
      sections?: ApiSection[];
    };

    type ApiAttempt = {
      durationMinutes?: number;
      questions?: ApiQuestion[];
      test?: ApiTest;
    };

    const attempt = attemptData.data as ApiAttempt;
    const test = attempt.test;

    // Check if we have test.sections structure (new API format)
    if (test?.sections && Array.isArray(test.sections)) {
      return {
        durationMinutes: test.durationMinutes || attempt.durationMinutes || 60,
        sections: test.sections.map((section: ApiSection) => ({
          id: section.id,
          name: section.name || "Questions",
          questions: (section.questions || []).map((q: ApiQuestion) => ({
            id: q.id,
            text: q.text,
            imageUrl: q.imageUrl || undefined,
            type: q.type as EngineQuestion["type"],
            options: (q.options || []).map(
              (opt: {
                id: string;
                text: string;
                imageUrl?: string | null;
                isCorrect?: boolean;
              }) => ({
                id: opt.id,
                text: opt.text,
                imageUrl:
                  opt.imageUrl && typeof opt.imageUrl === "string"
                    ? opt.imageUrl
                    : undefined,
                isCorrect: opt.isCorrect,
              })
            ),
            marks: q.marks || 1,
            negativeMarks: q.negativeMarks || 0,
          })),
        })),
      };
    }

    // Fallback to old format (attempt.questions) if sections structure doesn't exist
    if (attempt.questions && Array.isArray(attempt.questions)) {
      type SectionAccumulator = Array<{
        id: string;
        name: string;
        questions: EngineQuestion[];
      }>;

      return {
        durationMinutes: attempt.durationMinutes || 60,
        sections: attempt.questions.reduce(
          (acc: SectionAccumulator, q: ApiQuestion) => {
            const sectionId = q.sectionId || "default";
            let section = acc.find((s) => s.id === sectionId);
            if (!section) {
              section = { id: sectionId, name: "Questions", questions: [] };
              acc.push(section);
            }
            section.questions.push({
              id: q.id,
              text: q.text,
              imageUrl: q.imageUrl || undefined,
              type: q.type as EngineQuestion["type"],
              options: (q.options || []).map(
                (opt: {
                  id: string;
                  text: string;
                  imageUrl?: string | null;
                  isCorrect?: boolean;
                }) => ({
                  id: opt.id,
                  text: opt.text,
                  imageUrl:
                    opt.imageUrl && typeof opt.imageUrl === "string"
                      ? opt.imageUrl
                      : undefined,
                  isCorrect: opt.isCorrect,
                })
              ),
              marks: q.marks || 1,
              negativeMarks: q.negativeMarks || 0,
            });
            return acc;
          },
          [] as SectionAccumulator
        ),
      };
    }

    // If neither structure exists, return null
    return null;
  }, [enableMock, attemptData]);

  const flatQuestions = useMemo(
    () =>
      (data?.sections && Array.isArray(data.sections)
        ? data.sections.flatMap(
            (s: { questions: EngineQuestion[] }) => s.questions || []
          )
        : []) as EngineQuestion[],
    [data?.sections]
  );

  // Create question to section mapping for section indicator
  const questionSectionMap = useMemo(() => {
    const map = new Map<number, { name: string; index: number }>();
    if (data?.sections) {
      let globalIndex = 0;
      data.sections.forEach(
        (
          section: { name: string; questions: EngineQuestion[] },
          sectionIdx: number
        ) => {
          (section.questions || []).forEach(() => {
            map.set(globalIndex, {
              name: section.name || "Questions",
              index: sectionIdx + 1,
            });
            globalIndex++;
          });
        }
      );
    }
    return map;
  }, [data?.sections]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = flatQuestions[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === flatQuestions.length - 1;

  // Initialize mock start time for mock tests
  const [mockStartTime] = useState(() => (enableMock ? Date.now() : null));

  // Get attempt state from backend or local
  const attemptStartedAt = enableMock
    ? mockStartTime
    : attemptData?.data?.startedAt
    ? new Date(attemptData.data.startedAt).getTime()
    : undefined;
  const attemptSubmittedAt = attemptData?.data?.submittedAt
    ? new Date(attemptData.data.submittedAt).getTime()
    : undefined;
  const isActive = attemptStartedAt && !attemptSubmittedAt;
  const durationMinutes = data?.durationMinutes || 0;

  // Debug timer inputs
  useEffect(() => {
    console.log("[TEST ENGINE DEBUG] Timer inputs:", {
      enableMock,
      mockStartTime,
      attemptStartedAt,
      durationMinutes,
      hasData: !!data,
      dataDurationMinutes: data?.durationMinutes,
      isActive,
    });
  }, [
    enableMock,
    mockStartTime,
    attemptStartedAt,
    durationMinutes,
    data,
    isActive,
  ]);

  // Initialize answers from backend if available
  useEffect(() => {
    if (attemptData?.data?.answers && Array.isArray(attemptData.data.answers)) {
      // Convert answers array to Record format
      const answersMap: Record<string, unknown> = {};
      const reviewMap: Record<string, boolean> = {};

      attemptData.data.answers.forEach(
        (answer: {
          questionId: string;
          selectedOptionId?: string | null;
          textAnswer?: string | null;
          isMarkedForReview?: boolean;
        }) => {
          // Store the actual answer value (selectedOptionId for MCQ/TRUE_FALSE, textAnswer for NUMERICAL/FILL_BLANK)
          if (answer.selectedOptionId) {
            answersMap[answer.questionId] = answer.selectedOptionId;
          } else if (
            answer.textAnswer !== null &&
            answer.textAnswer !== undefined
          ) {
            answersMap[answer.questionId] = answer.textAnswer;
          }

          // Store review status
          if (answer.isMarkedForReview) {
            reviewMap[answer.questionId] = true;
          }
        }
      );

      setLocalAnswers(answersMap);
      setMarkedForReview(reviewMap);
    }
  }, [attemptData]);

  // Track time spent on current question
  const [questionStartTime] = useState(() => Date.now());
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      const currentQ = flatQuestions[currentIndex];
      if (currentQ) {
        setAnswerTimeSpent((prev) => ({
          ...prev,
          [currentQ.id]: (prev[currentQ.id] || 0) + 1,
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, currentIndex, flatQuestions]);

  // Drive countdown from a small timer hook
  const tickCallback = useCallback(() => {
    // Touch function - can be empty for backend-driven
  }, []);

  const {
    remainingMs,
    minutes: remainingMinutes,
    seconds: remainingSeconds,
  } = useAttemptTimer(
    attemptStartedAt ?? undefined,
    durationMinutes,
    tickCallback
  );

  // Auto-submit on timer expiry once
  useEffect(() => {
    if (isActive && remainingMs <= 0 && attemptId && !enableMock) {
      handleSubmit();
    }
  }, [remainingMs, isActive, attemptId, enableMock]);

  // Save answer to backend (with debouncing could be added)
  const handleAnswer = useCallback(
    (answer: unknown) => {
      if (!currentQuestion) return;

      if (!attemptId || enableMock) {
        // Fallback to local state for mock
        setLocalAnswers((prev) => ({
          ...prev,
          [currentQuestion.id]: answer,
        }));
        return;
      }

      // Update local state immediately
      setLocalAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: answer,
      }));

      // Determine answer payload based on question type
      const question = currentQuestion;
      const timeSpent = answerTimeSpent[currentQuestion.id] || 0;

      const payload: {
        questionId: string;
        selectedOptionId?: string;
        textAnswer?: string;
        timeSpentSeconds: number;
        isMarkedForReview?: boolean;
      } = {
        questionId: currentQuestion.id,
        timeSpentSeconds: timeSpent,
        isMarkedForReview: markedForReview[currentQuestion.id] || false,
      };

      if (question.type === "MCQ" || question.type === "TRUE_FALSE") {
        if (typeof answer === "string") {
          payload.selectedOptionId = answer;
        } else if (
          answer &&
          typeof answer === "object" &&
          "optionId" in answer
        ) {
          payload.selectedOptionId = answer.optionId as string;
        }
      } else if (
        question.type === "FILL_BLANK" ||
        question.type === "NUMERICAL"
      ) {
        payload.textAnswer = String(answer || "");
      }

      // Save to backend
      saveAnswerMutation.mutate(
        { attemptId, payload },
        {
          onError: (error) => {
            console.error("Failed to save answer:", error);
            // Optionally show error notification
          },
        }
      );
    },
    [
      attemptId,
      enableMock,
      currentQuestion,
      answerTimeSpent,
      markedForReview,
      saveAnswerMutation,
    ]
  );

  const toggleReview = useCallback(() => {
    if (!currentQuestion) return;
    const newMarked = !markedForReview[currentQuestion.id];
    setMarkedForReview((m) => ({
      ...m,
      [currentQuestion.id]: newMarked,
    }));

    // If backend-driven, update the answer with review flag
    if (attemptId && !enableMock && currentQuestion) {
      const timeSpent = answerTimeSpent[currentQuestion.id] || 0;
      const currentAnswer = localAnswers[currentQuestion.id];

      const payload: {
        questionId: string;
        selectedOptionId?: string;
        textAnswer?: string;
        timeSpentSeconds: number;
        isMarkedForReview: boolean;
      } = {
        questionId: currentQuestion.id,
        timeSpentSeconds: timeSpent,
        isMarkedForReview: newMarked,
      };

      if (currentAnswer) {
        if (
          currentQuestion.type === "MCQ" ||
          currentQuestion.type === "TRUE_FALSE"
        ) {
          if (typeof currentAnswer === "string") {
            payload.selectedOptionId = currentAnswer;
          }
        } else {
          payload.textAnswer = String(currentAnswer);
        }
      }

      saveAnswerMutation.mutate({ attemptId, payload });
    }
  }, [
    markedForReview,
    currentQuestion,
    attemptId,
    enableMock,
    answerTimeSpent,
    localAnswers,
    saveAnswerMutation,
  ]);

  // Clear current answer
  const clearAnswer = useCallback(() => {
    if (!currentQuestion) return;
    setLocalAnswers((prev) => {
      const updated = { ...prev };
      delete updated[currentQuestion.id];
      return updated;
    });

    // If backend-driven, save empty answer
    if (attemptId && !enableMock) {
      const timeSpent = answerTimeSpent[currentQuestion.id] || 0;
      const payload: {
        questionId: string;
        selectedOptionId?: string;
        textAnswer?: string;
        timeSpentSeconds: number;
        isMarkedForReview?: boolean;
      } = {
        questionId: currentQuestion.id,
        timeSpentSeconds: timeSpent,
        isMarkedForReview: markedForReview[currentQuestion.id] || false,
      };

      if (
        currentQuestion.type === "MCQ" ||
        currentQuestion.type === "TRUE_FALSE"
      ) {
        // For clearing, don't include selectedOptionId
        delete payload.selectedOptionId;
      } else {
        payload.textAnswer = "";
      }

      saveAnswerMutation.mutate({ attemptId, payload });
    }
  }, [
    currentQuestion,
    attemptId,
    enableMock,
    answerTimeSpent,
    markedForReview,
    saveAnswerMutation,
  ]);

  // Jump to next unanswered question
  const jumpToNextUnanswered = useCallback(() => {
    const unansweredIndex = flatQuestions.findIndex(
      (q, idx) =>
        q &&
        idx > currentIndex &&
        (localAnswers[q.id] === undefined ||
          localAnswers[q.id] === null ||
          localAnswers[q.id] === "")
    );
    if (unansweredIndex !== -1) {
      setCurrentIndex(unansweredIndex);
    }
  }, [flatQuestions, currentIndex, localAnswers]);

  const handleSubmit = useCallback(() => {
    setShowSubmitDialog(true);
  }, []);

  const confirmSubmit = useCallback(async () => {
    setShowSubmitDialog(false);

    if (enableMock) {
      // For mock, just update local state
      return;
    }

    if (!attemptId) {
      console.error("No attemptId available");
      return;
    }

    try {
      await submitMutation.mutateAsync(attemptId);
    } catch (error) {
      console.error("Failed to submit attempt:", error);
      // Show error message
    }
  }, [attemptId, enableMock, submitMutation]);

  // Calculate time per question estimate (must be before conditional returns)
  const avgTimePerQuestion = useMemo(() => {
    if (flatQuestions.length === 0 || durationMinutes === 0) return 0;
    return Math.floor((durationMinutes * 60) / flatQuestions.length);
  }, [flatQuestions.length, durationMinutes]);

  // Get current section info (must be before conditional returns)
  const currentSection = useMemo(() => {
    return questionSectionMap.get(currentIndex);
  }, [questionSectionMap, currentIndex]);

  // Check if answer is being saved (must be before conditional returns)
  const isSaving = saveAnswerMutation.isPending;

  // Calculate progress and counts (must be before conditional returns)
  const progressPercentage = useMemo(
    () =>
      flatQuestions.length > 0
        ? ((currentIndex + 1) / flatQuestions.length) * 100
        : 0,
    [flatQuestions.length, currentIndex]
  );

  const answeredCount = useMemo(
    () =>
      flatQuestions.filter(
        (q) =>
          q &&
          localAnswers[q.id] !== undefined &&
          localAnswers[q.id] !== null &&
          localAnswers[q.id] !== ""
      ).length,
    [flatQuestions, localAnswers]
  );

  const reviewCount = useMemo(
    () => Object.values(markedForReview).filter(Boolean).length,
    [markedForReview]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Arrow keys for navigation
      if (e.key === "ArrowLeft" && !isFirst) {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight" && !isLast) {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(flatQuestions.length - 1, i + 1));
      }
      // Enter to submit (only if on last question)
      else if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && isLast) {
        e.preventDefault();
        handleSubmit();
      }
      // 'C' to clear answer
      else if (e.key === "c" || e.key === "C") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          clearAnswer();
        }
      }
      // 'J' to jump to next unanswered
      else if (e.key === "j" || e.key === "J") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          jumpToNextUnanswered();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    isFirst,
    isLast,
    flatQuestions.length,
    currentIndex,
    handleSubmit,
    clearAnswer,
    jumpToNextUnanswered,
  ]);

  // Loading state
  if (!enableMock && attemptId && isLoadingAttempt) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (!enableMock && attemptId && attemptError) {
    return (
      <Card className="mx-auto my-10 max-w-3xl p-8">
        <ErrorMessage
          error={
            (attemptError as { message?: string })?.message ||
            "Failed to load attempt details. Please try again."
          }
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push("/student/my-learning")}>
            Back to My Learning
          </Button>
        </div>
      </Card>
    );
  }

  // No data state
  if (!data || flatQuestions.length === 0) {
    return (
      <Card className="mx-auto my-10 max-w-3xl p-8 text-center">
        <div className="text-lg font-semibold mb-2">No questions available</div>
        <Button onClick={() => router.push("/student/my-learning")}>
          Back to My Learning
        </Button>
      </Card>
    );
  }

  // Show submission summary screen when not active and submitted
  if (!isActive && attemptSubmittedAt) {
    const submittedDate = new Date(attemptSubmittedAt).toLocaleString();
    const answeredCount = getAnsweredCount(localAnswers);
    const results = resultsData?.data;
    const totalMarks = flatQuestions.reduce(
      (sum, q) => sum + (q?.marks || 1),
      0
    );
    const percentage = results?.percentage || 0;
    const extendedResults = resultsData?.data as
      | (typeof results & {
          isPassed?: boolean;
          correctCount?: number;
          wrongCount?: number;
          skippedCount?: number;
        })
      | undefined;
    const isPassing = extendedResults?.isPassed ?? false;

    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full border shadow-lg overflow-hidden">
          {isLoadingResults ? (
            <CardContent className="p-12 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <Clock className="h-10 w-10 text-primary animate-spin" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Submitting...</h2>
                <p className="text-muted-foreground">
                  Please wait while we evaluate your test
                </p>
              </div>
            </CardContent>
          ) : results ? (
            <>
              {/* Success Header */}
              <div className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent p-8 text-center border-b">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="mx-auto w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4"
                >
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold mb-2"
                >
                  Test Submitted Successfully!
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground"
                >
                  Submitted on {submittedDate}
                </motion.p>
              </div>

              <CardContent className="p-8">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Score Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Score
                      </div>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {results.totalScore}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      out of {totalMarks} marks
                    </div>
                  </motion.div>

                  {/* Percentage Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow"
                  >
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
                    <div className="text-xs text-muted-foreground">
                      {isPassing ? (
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          Passed ✓
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-semibold">
                          Not Passed
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {/* Rank Card */}
                  {results.rank && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Rank
                        </div>
                      </div>
                      <div className="text-3xl font-bold mb-1">
                        #{results.rank}
                      </div>
                      {results.percentile && (
                        <div className="text-xs text-muted-foreground">
                          {results.percentile.toFixed(1)} percentile
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Questions Answered Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Answered
                      </div>
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {answeredCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      out of {flatQuestions.length} questions
                    </div>
                  </motion.div>
                </div>

                {/* Additional Stats */}
                {extendedResults?.correctCount !== undefined && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="grid grid-cols-3 gap-4 mb-8 p-6 rounded-xl bg-muted/50 border"
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {extendedResults.correctCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Correct
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {extendedResults.wrongCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Wrong</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {extendedResults.skippedCount || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Skipped
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
                >
                  <Button
                    size="lg"
                    onClick={() => router.push("/student/my-learning")}
                    className="min-w-[200px]"
                  >
                    Back to My Learning
                  </Button>
                  {attemptId && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/student/tests/${testId}/results?attemptId=${attemptId}`
                        )
                      }
                      className="min-w-[200px]"
                    >
                      View Detailed Results
                    </Button>
                  )}
                </motion.div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-12 text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
              >
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Submission Complete</h2>
                <p className="text-muted-foreground mb-4">
                  Submitted on {submittedDate}
                </p>
                <p className="text-sm text-muted-foreground">
                  Answered {answeredCount} out of {flatQuestions.length}{" "}
                  questions
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => router.push("/student/my-learning")}
                className="mt-4"
              >
                Back to My Learning
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Submit Confirmation Dialog */}
      <ConfirmationDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        title="Submit Test"
        description="Are you sure you want to submit your test? You cannot change answers after submission. This action cannot be undone."
        confirmText="Submit Test"
        onConfirm={confirmSubmit}
        variant="default"
        isLoading={submitMutation.isPending}
      />

      <div className="min-h-screen bg-background">
        {/* Premium Header */}
        <PremiumTestHeader
          remainingMinutes={remainingMinutes}
          remainingSeconds={remainingSeconds}
          currentIndex={currentIndex}
          totalQuestions={flatQuestions.length}
          violations={security.violations}
          maxViolations={security.maxViolations}
          markedForReview={
            currentQuestion
              ? Boolean(markedForReview[currentQuestion.id])
              : false
          }
          onToggleReview={toggleReview}
          onSubmit={handleSubmit}
        />

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* Question Area */}
            <div className="space-y-6">
              {/* Progress Indicator */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">
                          Test Progress
                        </p>
                        {currentSection && (
                          <Badge variant="outline" className="text-xs">
                            {currentSection.name}
                          </Badge>
                        )}
                        {isSaving && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Save className="h-3 w-3 animate-spin" />
                            Saving...
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {answeredCount} of {flatQuestions.length} questions
                        answered
                        {avgTimePerQuestion > 0 && (
                          <span className="ml-2">
                            • ~{avgTimePerQuestion}s per question
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {Math.round(progressPercentage)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-linear-to-r from-primary to-primary/80 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Question Card */}
              {currentQuestion && (
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <QuestionRenderer
                    question={currentQuestion}
                    value={localAnswers[currentQuestion.id]}
                    onChange={handleAnswer}
                  />
                </motion.div>
              )}

              {/* Navigation Controls */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      disabled={isFirst}
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      className="gap-2 min-w-[120px]"
                    >
                      <span>←</span>
                      Previous
                    </Button>

                    <div className="flex items-center gap-3 flex-1 justify-center">
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {answeredCount} answered
                      </Badge>
                      {reviewCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-sm px-3 py-1"
                        >
                          {reviewCount} marked
                        </Badge>
                      )}
                    </div>

                    <Button
                      size="lg"
                      disabled={isLast}
                      onClick={() =>
                        setCurrentIndex((i) =>
                          Math.min(flatQuestions.length - 1, i + 1)
                        )
                      }
                      className="gap-2 min-w-[120px]"
                    >
                      Next
                      <span>→</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <PremiumQuestionPalette
                total={flatQuestions.length}
                currentIndex={currentIndex}
                answeredMap={flatQuestions.reduce<Record<number, boolean>>(
                  (acc, q, idx) => {
                    if (!q) return acc;
                    acc[idx] =
                      localAnswers[q.id] !== undefined &&
                      localAnswers[q.id] !== null &&
                      localAnswers[q.id] !== "";
                    return acc;
                  },
                  {}
                )}
                reviewMap={flatQuestions.reduce<Record<number, boolean>>(
                  (acc, q, idx) => {
                    if (!q) return acc;
                    acc[idx] = Boolean(markedForReview[q.id]);
                    return acc;
                  },
                  {}
                )}
                onSelect={(idx) => setCurrentIndex(idx)}
              />

              <PremiumStatsSidebar
                answeredCount={answeredCount}
                totalQuestions={flatQuestions.length}
                reviewCount={reviewCount}
                remainingMinutes={remainingMinutes}
                remainingSeconds={remainingSeconds}
                progressPercentage={progressPercentage}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
