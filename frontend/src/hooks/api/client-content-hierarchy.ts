"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
import { normalizeContentPayload } from "./course-hierarchy";

// ==========================================
// Client Subjects API Hooks (for purchased batches)
// ==========================================

// Get all subjects for a purchased batch (CLIENT)
export const useGetClientSubjectsByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "subjects", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/api/subjects/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

// Get subject by ID (CLIENT)
export const useGetClientSubject = (id: string) => {
  return useQuery({
    queryKey: ["client", "subjects", id],
    queryFn: () => apiClient.get(`/api/subjects/${id}`).then((res) => res.data),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

// ==========================================
// Client Chapters API Hooks (for purchased batches)
// ==========================================

// Get all chapters for a subject (CLIENT)
export const useGetClientChaptersBySubject = (subjectId: string) => {
  return useQuery({
    queryKey: ["client", "chapters", "subject", subjectId],
    queryFn: () =>
      apiClient
        .get(`/api/chapters/subject/${subjectId}`)
        .then((res) => res.data),
    enabled: !!subjectId && tokenManager.isAuthenticated(),
  });
};

// Get chapter by ID (CLIENT)
export const useGetClientChapter = (id: string) => {
  return useQuery({
    queryKey: ["client", "chapters", id],
    queryFn: () => apiClient.get(`/api/chapters/${id}`).then((res) => res.data),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

// ==========================================
// Client Topics API Hooks (for purchased batches)
// ==========================================

// Get all topics for a chapter (CLIENT)
export const useGetClientTopicsByChapter = (chapterId: string) => {
  return useQuery({
    queryKey: ["client", "topics", "chapter", chapterId],
    queryFn: () =>
      apiClient.get(`/api/topics/chapter/${chapterId}`).then((res) => res.data),
    enabled: !!chapterId && tokenManager.isAuthenticated(),
  });
};

// Get topic by ID (CLIENT)
export const useGetClientTopic = (id: string) => {
  return useQuery({
    queryKey: ["client", "topics", id],
    queryFn: () => apiClient.get(`/api/topics/${id}`).then((res) => res.data),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

// ==========================================
// Client Contents API Hooks (for purchased batches)
// ==========================================

// Get all contents for a topic (CLIENT)
export const useGetClientContentsByTopic = (topicId: string) => {
  return useQuery({
    queryKey: ["client", "contents", "topic", topicId],
    queryFn: () =>
      apiClient
        .get(`/api/contents/topic/${topicId}`)
        .then((res) => normalizeContentPayload(res.data)),
    enabled: !!topicId && tokenManager.isAuthenticated(),
  });
};

// Get content by ID (CLIENT)
export const useGetClientContent = (id: string) => {
  return useQuery({
    queryKey: ["client", "contents", id],
    queryFn: () =>
      apiClient
        .get(`/api/contents/${id}`)
        .then((res) => normalizeContentPayload(res.data)),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

