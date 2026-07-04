"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

// ==========================================
// Assignments API Hooks
// ==========================================

export type AssignmentQuestionType =
  | "QUIZ"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "FILE_SUBMISSION";

export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AssignmentQuestionLevel = "EASY" | "MEDIUM" | "HARD";
export type AssignmentSubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "GRADED"
  | "RETURNED";

export interface AssignmentQuestionOption {
  id: string;
  text: string;
}

export interface AssignmentQuestion {
  id: string;
  assignmentId: string;
  type: AssignmentQuestionType;
  title?: string | null;
  prompt: string;
  optionsJson?: AssignmentQuestionOption[];
  options?: AssignmentQuestionOption[];
  correctAnswerJson?: Record<string, unknown>;
  points: number;
  order: number;
}

export interface Assignment {
  id: string;
  organizationId: string;
  batchId: string;
  topicId?: string | null;
  title: string;
  description?: string | null;
  status: AssignmentStatus;
  order: number;
  dueAt?: string | null;
  batch?: { id: string; name: string };
  topic?: { id: string; name: string } | null;
  questions?: AssignmentQuestion[];
  _count?: { questions?: number; submissions?: number };
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  answersJson?: Record<string, unknown>;
  score?: number | null;
  maxScore?: number | null;
  status: AssignmentSubmissionStatus;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  student?: { id: string; username: string; email?: string; profileImg?: string };
  aiFeedback?: AssignmentAiFeedback | null;
}

export interface AssignmentAiFeedback {
  id: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  batchId: string;
  scorePercent?: number | null;
  weakConceptsJson?: unknown[];
  strengthsJson?: unknown[];
  recommendationsJson?: unknown[];
  questionFeedbackJson?: Array<{
    questionId?: string;
    isCorrect?: boolean | null;
    feedback?: string;
    whyCorrectAnswer?: string;
    studyHint?: string;
  }>;
  feedbackText: string;
  generatedAt: string;
}

export const assignmentKeys = {
  all: ["assignments"] as const,
  list: (params?: { batchId?: string; topicId?: string }) =>
    ["assignments", "list", params?.batchId || "", params?.topicId || ""] as const,
  detail: (id: string) => ["assignments", id] as const,
  submissions: (assignmentId: string) =>
    ["assignments", assignmentId, "submissions"] as const,
  analytics: (assignmentId: string) =>
    ["assignments", assignmentId, "analytics"] as const,
};

export const useGetAssignments = (params?: {
  batchId?: string;
  topicId?: string;
}) => {
  return useQuery({
    queryKey: assignmentKeys.list(params),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Assignment[] }>("/admin/assignments", {
          params,
        })
        .then((res) => res.data),
  });
};

export const useGetAssignment = (id?: string) => {
  return useQuery({
    queryKey: assignmentKeys.detail(id || ""),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Assignment }>(`/admin/assignments/${id}`)
        .then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      batchId: string;
      topicId?: string;
      title: string;
      description?: string;
      status?: AssignmentStatus;
    }) =>
      apiClient
        .post<{ success: boolean; data: Assignment }>("/admin/assignments", data)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<Assignment, "title" | "description" | "status" | "dueAt">>;
    }) =>
      apiClient
        .put<{ success: boolean; data: Assignment }>(
          `/admin/assignments/${id}`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.detail(variables.id) });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/assignments/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

export const useCreateAssignmentQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: {
        type: AssignmentQuestionType;
        title?: string;
        prompt?: string;
        points?: number;
        options?: AssignmentQuestionOption[];
        correctAnswer?: Record<string, unknown>;
      };
    }) =>
      apiClient
        .post<{ success: boolean; data: AssignmentQuestion }>(
          `/admin/assignments/${assignmentId}/questions`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useGenerateAssignmentWithAi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      prompt,
      count,
      level,
    }: {
      assignmentId: string;
      prompt: string;
      count?: number;
      level?: AssignmentQuestionLevel;
    }) =>
      apiClient
        .post<{
          success: boolean;
          data: {
            questions: AssignmentQuestion[];
            ragChunksUsed?: number;
            ragStatus?: string;
          };
        }>(
          `/admin/assignments/${assignmentId}/generate`,
          { prompt, count, level }
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

export const useUpdateAssignmentQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      questionId,
      data,
    }: {
      assignmentId: string;
      questionId: string;
      data: Partial<{
        type: AssignmentQuestionType;
        title: string;
        prompt: string;
        points: number;
        options: AssignmentQuestionOption[];
        correctAnswer: Record<string, unknown>;
      }>;
    }) =>
      apiClient
        .put<{ success: boolean; data: AssignmentQuestion }>(
          `/admin/assignments/questions/${questionId}`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useDeleteAssignmentQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      questionId,
    }: {
      assignmentId: string;
      questionId: string;
    }) =>
      apiClient
        .delete(`/admin/assignments/questions/${questionId}`)
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useGetAssignmentSubmissions = (assignmentId?: string) => {
  return useQuery({
    queryKey: assignmentKeys.submissions(assignmentId || ""),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: AssignmentSubmission[] }>(
          `/admin/assignments/${assignmentId}/submissions`
        )
        .then((res) => res.data),
    enabled: !!assignmentId,
  });
};

export const useGetAssignmentAnalytics = (assignmentId?: string) => {
  return useQuery({
    queryKey: assignmentKeys.analytics(assignmentId || ""),
    queryFn: () =>
      apiClient
        .get<{
          success: boolean;
          data: {
            questions: number;
            submissions: number;
            graded: number;
            pending: number;
            published: number;
            gradedRate: number;
          };
        }>(`/admin/assignments/${assignmentId}/analytics`)
        .then((res) => res.data),
    enabled: !!assignmentId,
  });
};

export const useGradeAssignmentSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      submissionId,
      data,
    }: {
      assignmentId: string;
      submissionId: string;
      data: {
        score?: number;
        maxScore?: number;
        feedback?: string;
      };
    }) =>
      apiClient
        .put<{ success: boolean; data: AssignmentSubmission }>(
          `/admin/assignments/submissions/${submissionId}/grade`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.submissions(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.analytics(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const usePublishAssignmentSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      submissionId,
      data,
    }: {
      assignmentId: string;
      submissionId: string;
      data: {
        score?: number;
        maxScore?: number;
        feedback?: string;
      };
    }) =>
      apiClient
        .post<{ success: boolean; data: AssignmentSubmission }>(
          `/admin/assignments/submissions/${submissionId}/publish`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.submissions(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.analytics(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useGetStudentAssignment = (id?: string) => {
  return useQuery({
    queryKey: ["student", "assignment", id || ""],
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Assignment & { mySubmission?: AssignmentSubmission } }>(
          `/api/assignments/${id}`
        )
        .then((res) => res.data),
    enabled: !!id,
  });
};

export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, unknown> }) =>
      apiClient
        .post<{ success: boolean; data: AssignmentSubmission }>(
          `/api/assignments/${id}/submit`,
          { answers }
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["student", "assignment", variables.id],
      });
    },
  });
};

export const useSaveAssignmentDraft = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, unknown> }) =>
      apiClient
        .post<{ success: boolean; data: AssignmentSubmission }>(
          `/api/assignments/${id}/save`,
          { answers }
        )
        .then((res) => res.data),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(
        ["student", "assignment", variables.id],
        (current: { success: boolean; data: Assignment & { mySubmission?: AssignmentSubmission } } | undefined) => {
          if (!current?.data) return current;

          return {
            ...current,
            data: {
              ...current.data,
              mySubmission: response.data,
            },
          };
        }
      );
    },
  });
};

