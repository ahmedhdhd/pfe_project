"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

// ==========================================
// Chapters API Hooks
// ==========================================

// Create Chapter
export const useCreateChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; subjectId?: unknown; batchId?: unknown }) => {
      const payload: { name: string; subjectId?: string; batchId?: string } = {
        name: data.name,
      };

      if (typeof data.subjectId === "string" && data.subjectId.trim()) {
        payload.subjectId = data.subjectId;
      }

      if (typeof data.batchId === "string" && data.batchId.trim()) {
        payload.batchId = data.batchId;
      }

      return apiClient.post("/admin/chapters", payload).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });
};

// Get Chapters by Subject
export const useGetChaptersBySubject = (subjectId: string) => {
  return useQuery({
    queryKey: ["chapters", "subject", subjectId],
    queryFn: () =>
      apiClient
        .get(`/admin/chapters/subject/${subjectId}`)
        .then((res) => res.data),
    enabled: !!subjectId && subjectId.trim() !== "",
  });
};

// Get Chapter by ID
export const useGetChapter = (id: string) => {
  return useQuery({
    queryKey: ["chapters", id],
    queryFn: () =>
      apiClient.get(`/admin/chapters/${id}`).then((res) => res.data),
  });
};

// Update Chapter
export const useUpdateChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      apiClient.put(`/admin/chapters/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({
        queryKey: ["chapters", variables.id],
      });
    },
  });
};

// Delete Chapter
export const useDeleteChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/chapters/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });
};

