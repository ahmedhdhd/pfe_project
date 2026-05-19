import apiClient from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RecentCompletedTestsResponse,
  TestAttemptStatsResponse,
} from "@/lib/types/api";

export type AttemptApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type AttemptSummary = {
  id: string;
  testId: string;
  userId: string;
  attemptNumber?: number;
  startedAt: string;
  submittedAt?: string | null;
  timeSpentSeconds?: number;
  totalScore?: number;
  percentage?: number;
  correctCount?: number;
  wrongCount?: number;
  skippedCount?: number;
  isCompleted: boolean;
  isPassed?: boolean | null;
  rank?: number | null;
  percentile?: number | null;
  correctAnswers?: number; // Legacy field
  incorrectAnswers?: number; // Legacy field
  unattemptedQuestions?: number; // Legacy field
  createdAt?: string;
  updatedAt?: string;
};

export type AttemptDetails = AttemptSummary & {
  durationMinutes?: number;
  questions: Array<{
    id: string;
    sectionId?: string;
    text: string;
    imageUrl?: string;
    type: string;
    options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
    marks?: number;
    negativeMarks?: number;
  }>;
  answers?: Record<string, unknown>;
};

export type AnswerPayload = {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  timeSpentSeconds?: number;
  isMarkedForReview?: boolean;
};

export type SubmitResult = {
  attemptId: string;
  totalScore: number;
  percentage: number;
  rank?: number;
  percentile?: number;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  score: number;
  percentage: number;
};

const attemptKeys = {
  root: ["client", "attempts"] as const,
  detail: (attemptId: string) => [...attemptKeys.root, attemptId] as const,
  results: (attemptId: string) =>
    [...attemptKeys.root, attemptId, "results"] as const,
  solutions: (attemptId: string) =>
    [...attemptKeys.root, attemptId, "solutions"] as const,
  myAttempts: (testId: string) =>
    [...attemptKeys.root, "test", testId, "my"] as const,
  leaderboard: (testId: string, page: number, limit: number) =>
    [
      ...attemptKeys.root,
      "test",
      testId,
      "leaderboard",
      { page, limit },
    ] as const,
  recentCompleted: (filters: {
    page?: number;
    limit?: number;
    testSeriesId?: string;
    isPassed?: boolean;
  }) => [...attemptKeys.root, "recent-completed", filters] as const,
  stats: (testSeriesId?: string) =>
    [...attemptKeys.root, "stats", testSeriesId || "all"] as const,
};

export const useStartAttempt = () => {
  return useMutation({
    mutationFn: async (testId: string) => {
      const { data } = await apiClient.post<AttemptApiResponse<AttemptSummary>>(
        `/api/attempts/start/${testId}`
      );
      return data;
    },
  });
};

export const useAttemptDetails = (attemptId?: string) => {
  return useQuery({
    queryKey: attemptKeys.detail(attemptId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<AttemptApiResponse<AttemptDetails>>(
        `/api/attempts/${attemptId}`
      );
      return data;
    },
    enabled: Boolean(attemptId),
  });
};

export const useSaveAnswer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attemptId,
      payload,
    }: {
      attemptId: string;
      payload: AnswerPayload;
    }) => {
      const response = await apiClient.post<
        AttemptApiResponse<{ saved: boolean }>
      >(`/api/attempts/${attemptId}/answer`, payload);
      return response.data;
    },
    onSuccess: (_res, { attemptId }) => {
      qc.invalidateQueries({ queryKey: attemptKeys.detail(attemptId) });
    },
  });
};

export const useSubmitAttempt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attemptId: string) => {
      const { data } = await apiClient.post<AttemptApiResponse<SubmitResult>>(
        `/api/attempts/${attemptId}/submit`
      );
      return data;
    },
    onSuccess: (_res, attemptId) => {
      qc.invalidateQueries({ queryKey: attemptKeys.detail(attemptId) });
      qc.invalidateQueries({ queryKey: attemptKeys.results(attemptId) });
    },
  });
};

export const useAttemptResults = (attemptId?: string) => {
  return useQuery({
    queryKey: attemptKeys.results(attemptId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<AttemptApiResponse<SubmitResult>>(
        `/api/attempts/${attemptId}/results`
      );
      return data;
    },
    enabled: Boolean(attemptId),
  });
};

export const useAttemptSolutions = (attemptId?: string) => {
  return useQuery({
    queryKey: attemptKeys.solutions(attemptId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<AttemptApiResponse<unknown>>(
        `/api/attempts/${attemptId}/solutions`
      );
      return data;
    },
    enabled: Boolean(attemptId),
  });
};

export const useMyAttemptsByTest = (testId?: string) => {
  return useQuery({
    queryKey: attemptKeys.myAttempts(testId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<
        AttemptApiResponse<AttemptSummary[]>
      >(`/api/attempts/test/${testId}/my-attempts`);
      return data;
    },
    enabled: Boolean(testId),
  });
};

export const useLeaderboard = (
  testId?: string,
  page: number = 1,
  limit: number = 10
) => {
  return useQuery({
    queryKey: attemptKeys.leaderboard(testId ?? "", page, limit),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const { data } = await apiClient.get<
        AttemptApiResponse<{
          leaderboard: LeaderboardEntry[];
          userRank?: { rank: number; percentile: number };
        }>
      >(`/api/attempts/test/${testId}/leaderboard?${params.toString()}`);
      return data;
    },
    enabled: Boolean(testId),
  });
};

export const useRecentCompletedTests = (filters?: {
  page?: number;
  limit?: number;
  testSeriesId?: string;
  isPassed?: boolean;
}) => {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;

  return useQuery({
    queryKey: attemptKeys.recentCompleted(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (filters?.testSeriesId) {
        params.append("testSeriesId", filters.testSeriesId);
      }

      if (filters?.isPassed !== undefined) {
        params.append("isPassed", String(filters.isPassed));
      }

      const { data } = await apiClient.get<RecentCompletedTestsResponse>(
        `/api/attempts/recent-completed?${params.toString()}`
      );
      return data;
    },
  });
};

export const useTestAttemptStats = (testSeriesId?: string) => {
  return useQuery({
    queryKey: attemptKeys.stats(testSeriesId),
    queryFn: async () => {
      const params = testSeriesId
        ? new URLSearchParams({ testSeriesId })
        : new URLSearchParams();

      const { data } = await apiClient.get<TestAttemptStatsResponse>(
        `/api/attempts/stats${params.toString() ? `?${params.toString()}` : ""}`
      );
      return data;
    },
  });
};

export const attemptQueryKeys = attemptKeys;
