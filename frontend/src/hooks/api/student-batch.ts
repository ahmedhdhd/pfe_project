"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
import { ApiResponse } from "@/lib/types/api";
import { queryKeys } from "./query-keys";

// ==========================================
// Student/Client API Hooks
// ==========================================

// Get all batches for students/clients (explore page)
export const useGetExploreBatches = (
  page = 1,
  limit = 10,
  filters?: {
    language?: string;
    categoryId?: string;
    level?: string;
    price?: "free" | "paid";
    minRating?: number;
    minRatingCount?: number;
  },
  subdomain?: string
) => {
  return useQuery({
    queryKey: ["explore", "batches", subdomain || "", page, limit, filters],
    queryFn: () =>
      apiClient
        .get("/api/batches", {
          params: { page, limit, subdomain, ...(filters || {}) },
        })
        .then((res) => {
          const payload = res.data as {
            success?: boolean;
            data?: unknown;
            pagination?: unknown;
          };

          if (Array.isArray(payload?.data)) {
            return payload;
          }

          const nestedData =
            payload?.data && typeof payload.data === "object"
              ? (payload.data as {
                  batches?: unknown;
                  pagination?: unknown;
                })
              : undefined;

          return {
            ...payload,
            data: Array.isArray(nestedData?.batches) ? nestedData.batches : [],
            pagination: nestedData?.pagination ?? payload?.pagination,
          };
        }),
    enabled: true,
  });
};

// Get all purchased batches for student
export const useGetMyBatches = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["myBatches", page, limit],
    queryFn: () =>
      apiClient
        .get("/api/batches/my-batches", {
          params: { page, limit },
        })
        .then((res) => res.data),
    enabled: tokenManager.isAuthenticated(),
  });
};

// Get single batch details for students/clients
export const useGetExploreBatch = (id: string, subdomain?: string) => {
  return useQuery({
    queryKey: ["explore", "batch", subdomain || "", id],
    queryFn: () =>
      apiClient
        .get(`/api/batches/${id}`, { params: { subdomain } })
        .then((res) => res.data),
    enabled: !!id,
  });
};

export const useGetBatchCertificateStatus = (
  batchId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["batch", "certificate", batchId],
    queryFn: () =>
      apiClient
        .get(`/api/batches/${batchId}/certificate`)
        .then((res) => res.data),
    enabled: !!batchId && enabled && tokenManager.isAuthenticated(),
  });
};

export const useClaimBatchCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post(`/api/batches/${batchId}/certificate`)
        .then((res) => res.data),
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({
        queryKey: ["batch", "certificate", batchId],
      });
      queryClient.invalidateQueries({
        queryKey: ["explore", "batch", batchId],
      });
    },
  });
};

export const useCreateBatchReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      rating,
      comment,
    }: {
      batchId: string;
      rating: number;
      comment?: string;
    }) =>
      apiClient
        .post(`/api/batches/${batchId}/reviews`, { rating, comment })
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["explore", "batch", variables.batchId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.batchReviews(variables.batchId),
      });
      // The course player reads reviews from the purchased-courses query, so
      // refresh it too — otherwise a new review only shows after a page reload.
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
};

// Get all schedules for a purchased batch (STUDENT)
// @deprecated Use useGetClientSchedulesByBatch from schedules-client.ts instead
export const useGetBatchSchedules = (batchId: string) => {
  return useQuery({
    queryKey: ["batch", "schedules", batchId],
    queryFn: () =>
      apiClient.get(`/api/schedules/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

// Create batch checkout order for payment
export const useCreateBatchCheckout = () => {
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post(`/api/batches/${batchId}/checkout`)
        .then((res) => res.data),
  });
};

export const useVerifyBatchPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { orderId: string }) =>
        apiClient
          .post<
            ApiResponse<{
              verified: boolean;
              status?: string;
              message?: string;
              enrolledBatchIds?: string[];
            }>
          >(`/api/batches/verify-payment`, data)
        .then((res) => res.data),
    onSuccess: () => {
      // Invalidate my batches query to refetch purchased batches
      queryClient.invalidateQueries({ queryKey: ["myBatches"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batches"] });
    },
  });
};

// -- Konnect Batch Payment Hooks ---------------------------------------------

// Initiate Konnect checkout — backend calls Konnect init-payment and returns payUrl
export const useCreateBatchKonnectCheckout = () => {
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post<
          ApiResponse<{
            payUrl: string;
            paymentRef?: string;
            paymentLink?: string;
            orderId?: string;
            paymentId?: string;
          }>
        >(`/api/batches/${batchId}/konnect-checkout`)
        .then((res) => res.data),
  });
};

// Verify Konnect batch payment using the paymentRef in the redirect URL
export const useVerifyBatchKonnectPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { paymentRef: string }) =>
        apiClient
          .post<
            ApiResponse<{
              verified: boolean;
              status?: string;
              message?: string;
              enrolledBatchIds?: string[];
            }>
          >('/api/batches/konnect-verify', data)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBatches'] });
      queryClient.invalidateQueries({ queryKey: ['explore', 'batches'] });
    },
  });
};

// -- Subscription Payment Hooks -----------------------------------------------


export const useEnrollFreeBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post(`/api/batches/${batchId}/enroll-free`)
        .then((res) => res.data),
    onSuccess: (_, batchId) => {
      // Invalidate my batches query to refetch purchased batches
      queryClient.invalidateQueries({ queryKey: ["myBatches"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batches"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batch", batchId] });
    },
  });
};

