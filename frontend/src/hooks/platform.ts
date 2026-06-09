"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  platformApi,
  platformTokenManager,
} from "@/lib/api/platform";

export const platformQueryKeys = {
  stats: ["platform", "stats"] as const,
  organizations: ["platform", "organizations"] as const,
  organization: (id: string) => ["platform", "organization", id] as const,
  reports: (status?: string) => ["platform", "reports", status] as const,
};

export const usePlatformLogin = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await platformApi.login(data);
      if (!response.data.success) {
        throw new Error("Login failed");
      }
      return response.data.data;
    },
    onSuccess: (data) => {
      platformTokenManager.setToken(data.token);
      router.push("/platform/dashboard");
    },
  });
};

export const usePlatformLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return () => {
    platformTokenManager.clearToken();
    queryClient.clear();
    router.push("/platform/login");
  };
};

export const usePlatformStats = () =>
  useQuery({
    queryKey: platformQueryKeys.stats,
    queryFn: async () => {
      const response = await platformApi.getStats();
      return response.data.data;
    },
  });

export const usePlatformOrganizations = () =>
  useQuery({
    queryKey: platformQueryKeys.organizations,
    queryFn: async () => {
      const response = await platformApi.listOrganizations();
      return response.data.data;
    },
  });

export const usePlatformOrganization = (id: string) =>
  useQuery({
    queryKey: platformQueryKeys.organization(id),
    queryFn: async () => {
      const response = await platformApi.getOrganization(id);
      return response.data.data;
    },
    enabled: !!id,
  });

export const useUpdateOrganizationStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      platformApi.updateOrganizationStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.organizations });
    },
  });
};

export const useUpdateOrganizationPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      plan,
      subscriptionPrice,
      subscriptionType,
    }: {
      id: string;
      plan: string;
      subscriptionPrice?: number;
      subscriptionType?: string;
    }) =>
      platformApi.updateOrganizationPlan(id, {
        plan,
        subscriptionPrice,
        subscriptionType,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.organizations });
      queryClient.invalidateQueries({
        queryKey: platformQueryKeys.organization(variables.id),
      });
    },
  });
};

export const useToggleMaintenanceMode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      maintenanceMode,
    }: {
      id: string;
      maintenanceMode: boolean;
    }) => platformApi.toggleMaintenanceMode(id, maintenanceMode),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.organizations });
      queryClient.invalidateQueries({
        queryKey: platformQueryKeys.organization(variables.id),
      });
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => platformApi.deleteOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: platformQueryKeys.organizations });
      router.push("/platform/organizations");
    },
  });
};

export const usePlatformReports = (status?: string) =>
  useQuery({
    queryKey: platformQueryKeys.reports(status),
    queryFn: async () => {
      const response = await platformApi.listReports(status);
      return response.data.data;
    },
  });

export const useResolveReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      platformApi.resolveReport(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "reports"] });
    },
  });
};
