"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { ApiResponse } from "@/lib/types/api";

export const useSubscriptionCheckout = () => {
  return useMutation({
    mutationFn: () =>
      apiClient
        .post<
          ApiResponse<{
            payUrl: string;
            paymentRef?: string;
            paymentLink?: string;
            orderId?: string;
            paymentId?: string;
          }>
        >('/api/subscription/checkout')
        .then((res) => res.data),
  });
};

export const useVerifySubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { paymentRef?: string; orderId?: string }) =>
      apiClient
        .post<
          ApiResponse<{
            verified: boolean;
            status?: string;
            message?: string;
          }>
        >('/api/subscription/verify', data)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionStatus'] });
      queryClient.invalidateQueries({ queryKey: ['myBatches'] });
    },
  });
};

export const useSubscriptionStatus = () => {
  return useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: () =>
      apiClient
        .get<
          ApiResponse<{
            isSubscribed: boolean;
            paymentMode: string;
            subscribedAt?: string | null;
          }>
        >('/api/subscription/status')
        .then((res) => res.data),
    staleTime: 30_000,
  });
};

// Enroll in free batch
