"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api/client";
import { BatchReviewsResponse } from "@/lib/types/api";
import { queryKeys } from "./query-keys";

// Batch Management Hooks
export const useGetAllBatches = () => {
  return useQuery({
    queryKey: queryKeys.batches,
    queryFn: () => apiClient.get("/admin/batches").then((res) => res.data),
    enabled: true,
  });
};


export const useGetBatch = (id: string) => {
  return useQuery({
    queryKey: queryKeys.batch(id),
    queryFn: () =>
      apiClient.get(`/admin/batches/${id}`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useGetBatchReviewsAdmin = (id: string) => {
  return useQuery<BatchReviewsResponse>({
    queryKey: queryKeys.batchReviews(id),
    queryFn: () =>
      apiClient.get(`/admin/batches/${id}/reviews`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      class?: string;
      exam?: string;
      categoryId?: string;
      imageUrl?: string;
      introVideoUrl?: string;
      introVideoType?: string;
      startDate: string;
      endDate: string;
      language: string;
      level?: string;
      totalPrice: number;
      discountPercentage: number;
      faq: Array<{
        title: string;
        description: string;
      }>;
    }) => apiClient.post("/admin/batches", data).then((res) => res.data),
    onSuccess: (created) => {
      // Invalidate batches query to refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
      // Redirect to created batch detail when possible
      const extractId = (payload: unknown): string | undefined => {
        if (!payload || typeof payload !== "object") return undefined;
        const maybeWithData = payload as { data?: unknown; id?: unknown };
        if (maybeWithData.data && typeof maybeWithData.data === "object") {
          const inner = maybeWithData.data as { id?: unknown };
          if (typeof inner.id === "string") return inner.id;
        }
        if (typeof maybeWithData.id === "string") return maybeWithData.id;
        return undefined;
      };
      const createdId = extractId(created);
      if (createdId) {
        router.push(`/admin/courses/${createdId}`);
      } else {
        router.push("/admin/courses");
      }
    },
  });
};

export const useUpdateBatch = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        description: string;
        class?: string;
        exam?: string;
        categoryId?: string;
        imageUrl?: string;
        introVideoUrl?: string;
        introVideoType?: string;
        startDate: string;
        endDate: string;
        language: string;
        level?: string;
        totalPrice: number;
        discountPercentage: number;
        faq: Array<{
          title: string;
          description: string;
        }>;
        teacherId?: string;
      };
    }) => apiClient.put(`/admin/batches/${id}`, data).then((res) => res.data),
    onSuccess: (data, variables) => {
      // Invalidate both batches list and specific batch
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
      queryClient.invalidateQueries({
        queryKey: queryKeys.batch(variables.id),
      });
      // Redirect to updated batch detail page
      router.push(`/admin/courses/${variables.id}`);
    },
  });
};

export interface BatchCertificateConfigPayload {
  enabled: boolean;
  title?: string;
  heading?: string;
  templateId?: string;
  issuerName?: string;
  signerName?: string;
  signerTitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  linkedInOrgId?: string;
}

export interface BatchCertificateIssuePayload {
  id: string;
  credentialId: string;
  batchId: string;
  userId: string;
  recipientName: string;
  batchName: string;
  certificateTitle?: string | null;
  heading?: string | null;
  templateId?: string | null;
  issuerName?: string | null;
  signerName?: string | null;
  signerTitle?: string | null;
  linkedInOrgId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  progressPercentage: number;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchCertificateStatusPayload {
  batchId: string;
  batchName: string;
  configured: boolean;
  eligible: boolean;
  isCompleted: boolean;
  config: BatchCertificateConfigPayload;
  certificate?: BatchCertificateIssuePayload | null;
  progress: {
    totalVideos: number;
    completedVideos: number;
    progressPercentage: number;
    totalWatchTimeSeconds: number;
    isCompleted: boolean;
  };
}

export const useUpdateBatchCertificateConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: BatchCertificateConfigPayload;
    }) =>
      apiClient
        .put(`/admin/batches/${id}/certificate`, data)
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batch(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["explore", "batch", variables.id] });
    },
  });
};

export const useDeleteBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/batches/${id}`).then((res) => res.data),
    onSuccess: () => {
      // Invalidate batches query to refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

