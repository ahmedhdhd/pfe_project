"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
import {
  normalizeCourseHierarchyPayload,
  normalizeCourseOutlinePayload,
} from "./course-hierarchy";

// ==========================================
// Subjects API Hooks
// ==========================================

// Subject query keys (using inline arrays for now)

// Create Subject
export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      batchId: string;
      thumbnailUrl?: string;
    }) => apiClient.post("/admin/subjects", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};

// Get Subjects by Batch
export const useGetSubjectsByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["subjects", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/admin/subjects/batch/${batchId}`).then((res) => res.data),
  });
};

export const useGetCourseHierarchy = (batchId: string) => {
  return useQuery({
    queryKey: ["course-hierarchy", batchId],
    queryFn: () =>
      apiClient
        .get(`/admin/subjects/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseHierarchyPayload(res.data)),
    enabled: !!batchId && batchId.trim() !== "",
  });
};

export const useGetClientCourseHierarchy = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "course-hierarchy", batchId],
    queryFn: () =>
      apiClient
        .get(`/api/subjects/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseHierarchyPayload(res.data)),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

export const useGetChaptersByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["chapters", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/admin/chapters/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && batchId.trim() !== "",
  });
};

export const useGetCourseOutline = (batchId: string) => {
  return useQuery({
    queryKey: ["course-outline", batchId],
    queryFn: () =>
      apiClient
        .get(`/admin/chapters/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseOutlinePayload(res.data)),
    enabled: !!batchId && batchId.trim() !== "",
  });
};

export const useGetClientChaptersByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "chapters", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/api/chapters/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

export const useGetClientCourseOutline = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "course-outline", batchId],
    queryFn: () =>
      apiClient
        .get(`/api/chapters/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseOutlinePayload(res.data)),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

// Get Subject by ID
export const useGetSubject = (id: string) => {
  return useQuery({
    queryKey: ["subjects", id],
    queryFn: () =>
      apiClient.get(`/admin/subjects/${id}`).then((res) => res.data),
  });
};

// Update Subject
export const useUpdateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        thumbnailUrl?: string;
      };
    }) => apiClient.put(`/admin/subjects/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({
        queryKey: ["subjects", variables.id],
      });
    },
  });
};

// Delete Subject
export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/subjects/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};

