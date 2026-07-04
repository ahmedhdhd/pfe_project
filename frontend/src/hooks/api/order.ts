"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenManager } from "@/lib/api/client";

// ==========================================
// Order API Hooks (Client/Student)
// ==========================================

// Get order history with pagination
export const useOrderHistory = (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  return useQuery({
    queryKey: ["orderHistory", params?.page, params?.limit, params?.status],
    queryFn: () => api.getOrderHistory(params).then((res) => res.data),
    enabled: tokenManager.isAuthenticated(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useGetOrderById = (id?: string) => {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => api.getOrderById(id as string).then((res) => res.data),
    enabled: tokenManager.isAuthenticated() && Boolean(id),
  });
};

export const useCreateCourseOrderCheckout = () => {
  return useMutation({
    mutationFn: (data: {
      batchIds: string[];
      paymentMethod: "gateway" | "bank_transfer" | "mandat_minute_poste";
      billing: {
        firstName: string;
        lastName: string;
        enterprise?: string;
        taxNumber?: string;
        region: string;
        phone: string;
        email: string;
      };
    }) => api.createCourseOrderCheckout(data).then((res) => res.data),
  });
};

export const useUploadOrderProof = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; proofImageUrl: string }) =>
      api
        .uploadOrderProof(data.id, { proofImageUrl: data.proofImageUrl })
        .then((res) => res.data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orderHistory"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["adminOrder", variables.id] });
    },
  });
};

export const useAdminOrders = (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  return useQuery({
    queryKey: ["adminOrders", params?.page, params?.limit, params?.status],
    queryFn: () => api.getAdminOrders(params).then((res) => res.data),
    enabled: tokenManager.isAuthenticated(),
    staleTime: 60 * 1000,
  });
};

export const useAdminOrderById = (id?: string) => {
  return useQuery({
    queryKey: ["adminOrder", id],
    queryFn: () => api.getAdminOrderById(id as string).then((res) => res.data),
    enabled: tokenManager.isAuthenticated() && Boolean(id),
  });
};

export const useApproveAdminOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; note?: string }) =>
      api
        .approveAdminOrder(data.id, data.note ? { note: data.note } : undefined)
        .then((res) => res.data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["adminOrder", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["orderHistory"] });
      queryClient.invalidateQueries({ queryKey: ["myBatches"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batches"] });
    },
  });
};

export const useRejectAdminOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; note?: string }) =>
      api
        .rejectAdminOrder(data.id, data.note ? { note: data.note } : undefined)
        .then((res) => res.data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      queryClient.invalidateQueries({ queryKey: ["adminOrder", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["orderHistory"] });
    },
  });
};

