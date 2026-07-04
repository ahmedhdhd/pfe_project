"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { patchTopicQuizInHierarchyPayload } from "./course-hierarchy";

// ==========================================
// Topics API Hooks
// ==========================================

export type TopicQuizQuestionType =
  | "MCQ"
  | "TRUE_FALSE";

export interface TopicQuizOption {
  id: string;
  text: string;
}

export interface TopicQuizQuestion {
  id: string;
  text: string;
  type: TopicQuizQuestionType;
  explanation?: string;
  options?: TopicQuizOption[];
  correctOptionId?: string;
  correctText?: string;
  correctNumber?: number;
}

export interface TopicQuiz {
  title?: string;
  description?: string;
  passingPercentage: number;
  questions: TopicQuizQuestion[];
}

export interface TopicQuizQuestionResult {
  questionId: string;
  questionText: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export interface TopicQuizAttemptSummary {
  id: string;
  attemptNumber: number;
  score: number;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  completedAt: string;
  questionResults?: TopicQuizQuestionResult[];
}

// Create Topic
export const useCreateTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; chapterId: string }) =>
      apiClient.post("/admin/topics", data).then((res) => res.data),
    onSuccess: (data, variables) => {
      // Invalidate all topics queries and specifically the chapter topics
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({
        queryKey: ["topics", "chapter", variables.chapterId],
      });
    },
  });
};

// Get Topics by Chapter
export const useGetTopicsByChapter = (chapterId: string) => {
  return useQuery({
    queryKey: ["topics", "chapter", chapterId],
    queryFn: () =>
      apiClient
        .get(`/admin/topics/chapter/${chapterId}`)
        .then((res) => res.data),
    enabled: !!chapterId && chapterId.trim() !== "",
  });
};

// Get Topic by ID
export const useGetTopic = (id: string) => {
  return useQuery({
    queryKey: ["topics", id],
    queryFn: () => apiClient.get(`/admin/topics/${id}`).then((res) => res.data),
  });
};

// Update Topic
export const useUpdateTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      apiClient.put(`/admin/topics/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({
        queryKey: ["topics", variables.id],
      });
    },
  });
};

export const useUpdateTopicQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quiz }: { id: string; quiz: TopicQuiz }) =>
      apiClient.put(`/admin/topics/${id}/quiz`, { quiz }).then((res) => res.data),
    onSuccess: (response, variables) => {
      const nextQuiz =
        response &&
        typeof response === "object" &&
        "data" in response &&
        response.data &&
        typeof response.data === "object" &&
        "quiz" in response.data
          ? ((response.data as { quiz?: TopicQuiz | null }).quiz ?? variables.quiz)
          : variables.quiz;

      queryClient.setQueriesData(
        { queryKey: ["course-outline"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            variables.id,
            nextQuiz
          )
      );
      queryClient.setQueriesData(
        { queryKey: ["course-hierarchy"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            variables.id,
            nextQuiz
          )
      );
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
      queryClient.invalidateQueries({ queryKey: ["topics", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["client", "course-hierarchy"],
      });
    },
  });
};

export const useDeleteTopicQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/topics/${id}/quiz`).then((res) => res.data),
    onSuccess: (_, id) => {
      queryClient.setQueriesData(
        { queryKey: ["course-outline"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            id,
            null
          )
      );
      queryClient.setQueriesData(
        { queryKey: ["course-hierarchy"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            id,
            null
          )
      );
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
      queryClient.invalidateQueries({ queryKey: ["topics", id] });
      queryClient.invalidateQueries({
        queryKey: ["client", "course-hierarchy"],
      });
    },
  });
};

export const useSubmitTopicQuizAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicId,
      answers,
    }: {
      topicId: string;
      answers: Record<string, unknown>;
    }) =>
      apiClient
        .post(`/api/topics/${topicId}/quiz-attempts`, { answers })
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["topics", variables.topicId] });
      queryClient.invalidateQueries({
        queryKey: ["client", "course-hierarchy"],
      });
    },
  });
};

// Delete Topic
export const useDeleteTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/topics/${id}`).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all topics queries
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });
};

