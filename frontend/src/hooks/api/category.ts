"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "./query-keys";

export const useGetCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiClient.get("/admin/categories").then((res) => res.data),
    enabled: true,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; icon?: string; parentId?: string | null }) =>
      apiClient.post("/admin/categories", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; icon?: string; parentId?: string | null };
    }) => apiClient.put(`/admin/categories/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/categories/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

