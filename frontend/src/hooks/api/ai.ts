"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { ApiResponse } from "@/lib/types/api";

// ── AI Layer Hooks ────────────────────────────────────────────────────────────

import type {
  AiChatRequest,
  AiChatResponse,
  AiPlayground,
  WeakConceptFlag,
} from "@/lib/types/api";

/** Send a message to the AI tutor (non-streaming V1) */
export const useAiChat = () => {
  return useMutation({
    mutationFn: (payload: AiChatRequest) =>
      apiClient
        .post<AiChatResponse>("/api/ai/chat", payload, {
          timeout: 180000,
        })
        .then((res) => res.data),
  });
};

/** Teacher: generate or refine a playground widget */
export const useTeacherGeneratePlayground = () => {
  return useMutation({
    mutationFn: (payload: {
      prompt: string;
      concept: string;
      batchId: string;
      topicId?: string;
      contentId?: string;
      refineFromId?: string;
      refinementCount?: number;
    }) =>
      apiClient
        .post<ApiResponse<{ playground: AiPlayground & { html: string } }>>(
          "/api/ai/playground/generate",
          payload,
          { timeout: 180000 }
        )
        .then((res) => res.data),
  });
};

/** Teacher/Admin: list all playgrounds for a batch */
export const useGetBatchPlaygrounds = (batchId: string, enabled = true) => {
  return useQuery({
    queryKey: ["ai-playgrounds", batchId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AiPlayground[]>>(
        `/api/ai/playgrounds/${batchId}`
      );
      return res.data?.data ?? [];
    },
    enabled: !!batchId && enabled,
  });
};

/** Teacher/Admin: load a saved playground with HTML preview */
export const useGetPlaygroundById = (id: string | null, enabled = true) => {
  return useQuery({
    queryKey: ["ai-playground", id],
    queryFn: async () => {
      const res = await apiClient.get<
        ApiResponse<{ playground: AiPlayground & { html: string } }>
      >(`/api/ai/playground/${id}`);
      return res.data?.data?.playground ?? null;
    },
    enabled: !!id && enabled,
  });
};

export const usePublishPlaygroundToTopic = () => {
  return useMutation({
    mutationFn: ({
      playgroundId,
      topicId,
      title,
      description,
    }: {
      playgroundId: string;
      topicId: string;
      title: string;
      description?: string;
    }) =>
      apiClient
        .post<ApiResponse<{ content: { id: string; topicId: string; title: string } }>>(
          `/api/ai/playground/${playgroundId}/publish`,
          { topicId, title, description }
        )
        .then((res) => res.data),
  });
};

/** Teacher/Admin: get weak concept analytics for a batch */
export const useGetWeakConcepts = (batchId: string) => {
  return useQuery({
    queryKey: ["weak-concepts", batchId],
    queryFn: () =>
      apiClient
        .get<ApiResponse<WeakConceptFlag[]>>(`/api/ai/weak-concepts/${batchId}`)
        .then((res) => res.data),
    enabled: !!batchId,
  });
};
