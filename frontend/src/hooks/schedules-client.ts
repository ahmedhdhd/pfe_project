"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
import type {
  Schedule,
  ScheduleFilters,
  ScheduleListResponse,
  ScheduleJoinSession,
  ScheduleWhiteboard,
} from "@/lib/types/schedule";

const normalizeScheduleListResponse = (payload: unknown): ScheduleListResponse => {
  if (!payload || typeof payload !== "object") {
    return { data: [] };
  }

  const record = payload as {
    data?: unknown;
    total?: unknown;
    page?: unknown;
    limit?: unknown;
    totalPages?: unknown;
  };

  if (Array.isArray(record.data)) {
    return {
      data: record.data as Schedule[],
      total:
        typeof record.total === "number" ? record.total : undefined,
      page: typeof record.page === "number" ? record.page : undefined,
      limit: typeof record.limit === "number" ? record.limit : undefined,
      totalPages:
        typeof record.totalPages === "number" ? record.totalPages : undefined,
    };
  }

  if (record.data && typeof record.data === "object") {
    const nested = record.data as {
      data?: unknown;
      total?: unknown;
      page?: unknown;
      limit?: unknown;
      totalPages?: unknown;
    };

    return {
      data: Array.isArray(nested.data) ? (nested.data as Schedule[]) : [],
      total:
        typeof nested.total === "number" ? nested.total : undefined,
      page: typeof nested.page === "number" ? nested.page : undefined,
      limit: typeof nested.limit === "number" ? nested.limit : undefined,
      totalPages:
        typeof nested.totalPages === "number" ? nested.totalPages : undefined,
    };
  }

  return { data: [] };
};

/**
 * Query keys for client schedule-related queries
 */
export const clientScheduleQueryKeys = {
  all: ["client", "schedules"] as const,
  lists: () => [...clientScheduleQueryKeys.all, "list"] as const,
  list: (filters?: ScheduleFilters) =>
    [...clientScheduleQueryKeys.lists(), filters] as const,
  details: () => [...clientScheduleQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...clientScheduleQueryKeys.details(), id] as const,
  byTopic: (topicId: string) =>
    [...clientScheduleQueryKeys.all, "topic", topicId] as const,
  byBatch: (batchId: string) =>
    [...clientScheduleQueryKeys.all, "batch", batchId] as const,
};

/**
 * Get all schedules for purchased batches (STUDENT)
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetClientSchedules({
 *   page: 1,
 *   limit: 10,
 *   status: "LIVE",
 *   upcoming: true
 * });
 * ```
 */
export const useGetClientSchedules = (filters?: ScheduleFilters) => {
  return useQuery({
    queryKey: clientScheduleQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.status) params.append("status", filters.status);
      if (filters?.batchId) params.append("batchId", filters.batchId);
      if (filters?.upcoming !== undefined)
        params.append("upcoming", filters.upcoming.toString());

      const response = await apiClient.get<ScheduleListResponse>(
        `/api/schedules?${params.toString()}`
      );
      return normalizeScheduleListResponse(response.data);
    },
    enabled: tokenManager.isAuthenticated(),
  });
};

/**
 * Get all schedules for a specific batch (STUDENT)
 * Only accessible if user has purchased the batch
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetClientSchedulesByBatch(batchId);
 * ```
 */
export const useGetClientSchedulesByBatch = (batchId: string) => {
  return useQuery({
    queryKey: clientScheduleQueryKeys.byBatch(batchId),
    queryFn: async () => {
      const response = await apiClient.get<ScheduleListResponse>(
        `/api/schedules/batch/${batchId}`
      );
      return normalizeScheduleListResponse(response.data);
    },
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

/**
 * Get all schedules for a specific topic (STUDENT)
 * Only accessible if user has purchased the batch
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetClientSchedulesByTopic(topicId);
 * ```
 */
export const useGetClientSchedulesByTopic = (topicId: string) => {
  return useQuery({
    queryKey: clientScheduleQueryKeys.byTopic(topicId),
    queryFn: async () => {
      const response = await apiClient.get<ScheduleListResponse>(
        `/api/schedules/topic/${topicId}`
      );
      return normalizeScheduleListResponse(response.data);
    },
    enabled: !!topicId && tokenManager.isAuthenticated(),
  });
};

/**
 * Get a single schedule by ID (STUDENT)
 * Only accessible if user has purchased the batch
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetClientSchedule(scheduleId);
 * ```
 */
export const useGetClientSchedule = (id: string) => {
  return useQuery({
    queryKey: clientScheduleQueryKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Schedule }>(
        `/api/schedules/${id}`
      );
      return response.data.data;
    },
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

export const useGetClientScheduleJoinToken = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...clientScheduleQueryKeys.detail(id), "join-token"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ScheduleJoinSession }>(
        `/api/schedules/${id}/join-token`
      );
      return response.data.data;
    },
    enabled: !!id && enabled && tokenManager.isAuthenticated(),
    staleTime: 60 * 1000,
  });
};

export const useGetClientScheduleWhiteboard = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...clientScheduleQueryKeys.detail(id), "whiteboard"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ScheduleWhiteboard }>(
        `/api/schedules/${id}/whiteboard`
      );
      return response.data.data;
    },
    enabled: !!id && enabled && tokenManager.isAuthenticated(),
    refetchInterval: 4000,
  });
};

export const useUpdateClientScheduleWhiteboard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ScheduleWhiteboard>;
    }) => {
      const response = await apiClient.patch<{ data: ScheduleWhiteboard }>(
        `/api/schedules/${id}/whiteboard`,
        data
      );
      return response.data.data;
    },
    onSuccess: (whiteboard, variables) => {
      queryClient.setQueryData(
        [...clientScheduleQueryKeys.detail(variables.id), "whiteboard"],
        whiteboard
      );
      queryClient.invalidateQueries({
        queryKey: [...clientScheduleQueryKeys.detail(variables.id), "whiteboard"],
      });
    },
  });
};
