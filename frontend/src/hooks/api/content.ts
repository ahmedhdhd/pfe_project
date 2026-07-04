"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import type { ContentBlockDocument } from "@/lib/content-blocks";
import { normalizeContentPayload } from "./course-hierarchy";

// ==========================================
// Contents API Hooks
// ==========================================

interface ContentData {
  title: string;
  name?: string;
  description?: string;
  topicId?: string;
  body?: ContentBlockDocument | null;
  type: "Lecture" | "PDF" | "MARKDOWN" | "URL" | "PLAYGROUND";
  pdfUrl?: string;
  markdownBody?: string;
  externalUrl?: string;
  externalProvider?: string;
  playgroundId?: string;
  videoUrl?: string;
  videoType?: "YOUTUBE" | "HLS";
  videoThumbnail?: string;
  videoDuration?: number;
}


// Create Content
export const useCreateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContentData) =>
      apiClient.post("/admin/contents", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
    },
  });
};

// Get Contents by Topic
// Note: Both admin and teacher use the same /admin/ endpoint
export const useGetContentsByTopic = (topicId: string) => {
  return useQuery({
    queryKey: ["contents", "topic", topicId],
    queryFn: () =>
      apiClient
        .get(`/admin/contents/topic/${topicId}`)
        .then((res) => normalizeContentPayload(res.data)),
    enabled: !!topicId, // Only fetch if topicId is provided
  });
};

// Get Content by ID
export const useGetContent = (id: string) => {
  return useQuery({
    queryKey: ["contents", id],
    queryFn: () =>
      apiClient
        .get(`/admin/contents/${id}`)
        .then((res) => normalizeContentPayload(res.data)),
  });
};

// Update Content
export const useUpdateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContentData> }) =>
      apiClient.put(`/admin/contents/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({
        queryKey: ["contents", variables.id],
      });
    },
  });
};

// Delete Content
export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/contents/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
    },
  });
};

export const useReorderContents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicId,
      orderedContentIds,
    }: {
      topicId: string;
      orderedContentIds: string[];
    }) =>
      apiClient
        .put(`/admin/contents/topic/${topicId}/reorder`, { orderedContentIds })
        .then((res) => normalizeContentPayload(res.data)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({
        queryKey: ["contents", "topic", variables.topicId],
      });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

