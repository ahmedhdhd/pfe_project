"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import apiClient from "@/lib/api/client";
import { setCachedConfig } from "@/lib/config/cache";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import {
  ApiResponse,
  Organization,
  CreateOrganizationConfigData,
  CreateOrganizationConfigResponse,
} from "@/lib/types/api";
import { queryKeys } from "./query-keys";

// Organization Hooks
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; slug: string }) =>
      api.createOrganization(data).then((res) => res.data),
    onSuccess: (data: ApiResponse<Organization>) => {
      if (data.success && data.data) {
        // Cache the organization
        queryClient.setQueryData(queryKeys.organization, data.data);
      }
    },
    onError: (error) => {
      console.error("Failed to create organization:", error);
    },
  });
};

// Organization Configuration Hook (Public endpoint)
export const useOrganizationConfig = (slug: string) => {
  return useQuery({
    queryKey: queryKeys.organizationConfig(slug),
    queryFn: () => api.getOrganizationConfig(slug).then((res) => res.data),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

// Organization Configuration Hook (Admin endpoint)
export const useCreateOrganizationConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationConfigData) =>
      api.createOrganizationConfig(data).then((res) => res.data),
    onSuccess: (data: CreateOrganizationConfigResponse) => {
      if (data.success && data.data) {
        // Cache the organization configuration
        queryClient.setQueryData(
          queryKeys.organizationConfig(data.data.slug),
          data
        );
      }
    },
    onError: (error) => {
      console.error("Failed to create organization configuration:", error);
    },
  });
};

// Get Organization Configuration (Admin endpoint)
export const useOrganizationConfigAdmin = () => {
  return useQuery({
    queryKey: ["organizationConfig", "admin"],
    queryFn: () => api.getOrganizationConfigAdmin().then((res) => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update Organization Configuration Hook (Admin endpoint)
export const useUpdateOrganizationConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationConfigData) =>
      api.updateOrganizationConfig(data).then((res) => res.data),
    onSuccess: (data: CreateOrganizationConfigResponse) => {
      if (data.success && data.data) {
        // Invalidate and update cache
        queryClient.invalidateQueries({ queryKey: ["organizationConfig"] });
        queryClient.setQueryData(["organizationConfig", "admin"], data);
        queryClient.setQueryData(
          queryKeys.organizationConfig(data.data.slug),
          data
        );
        setCachedConfig(data.data.slug, data.data);
        useOrganizationConfigStore.getState().setConfig(data.data);
      }
    },
    onError: (error) => {
      console.error("Failed to update organization configuration:", error);
    },
  });
};

export const useGenerateOrganizationTheme = () => {
  return useMutation({
    mutationFn: (data: { description: string; currentCustomCss?: string }) =>
      api.generateOrganizationTheme(data).then((res) => res.data),
    onError: (error) => {
      console.error("Failed to generate organization theme:", error);
    },
  });
};


// ==========================================
// Admin Utilities
// ==========================================

// Clear all cached data for the organization (ADMIN only)
export const useClearOrganizationCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/admin/cache/clear");
      return res.data as {
        success: boolean;
        message?: string;
        data?: { clearedKeys?: number };
      };
    },
    onSuccess: () => {
      // Invalidate all client-side caches so fresh data is fetched
      queryClient.invalidateQueries();
      // Optionally also clear mutations cache if needed in the future
    },
    onError: (error) => {
      console.error("Failed to clear organization cache:", error);
    },
  });
};

