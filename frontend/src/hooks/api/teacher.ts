"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "./query-keys";

// Teacher Management Hooks
export const useCreateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      batchIds: string[];
      highlights: Record<string, unknown>;
      imageUrl?: string;
      subjects: string[];
    }) => apiClient.post("/admin/teachers", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
};

export const useGetAllTeachers = () => {
  return useQuery({
    queryKey: ["teachers", "all"],
    queryFn: () => apiClient.get(`/admin/teachers`).then((res) => res.data),
  });
};

export const useGetTeachersByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["teachers", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/admin/teachers/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId,
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        highlights: Record<string, unknown>;
        imageUrl?: string;
        subjects: string[];
        batchId?: string;
      };
    }) => apiClient.put(`/admin/teachers/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/teachers/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
};

export const useAssignTeacherToBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teacherId,
      batchId,
    }: {
      teacherId: string;
      batchId: string;
    }) =>
      apiClient
        .post(`/admin/teachers/${teacherId}/batches/${batchId}`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

export const useRemoveTeacherFromBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teacherId,
      batchId,
    }: {
      teacherId: string;
      batchId: string;
    }) =>
      apiClient
        .delete(`/admin/teachers/${teacherId}/batches/${batchId}`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

