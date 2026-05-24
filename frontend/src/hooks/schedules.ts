"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
import type {
  Schedule,
  CreateScheduleData,
  UpdateScheduleData,
  UpdateScheduleStatusData,
  ScheduleFilters,
  ScheduleListResponse,
  ScheduleJoinSession,
  ScheduleWhiteboard,
  ScheduleAttendance,
  ScheduleAttendanceSummary,
  ScheduleAiSummary,
} from "@/lib/types/schedule";

const normalizeScheduleListResponse = (
  payload: unknown
): ScheduleListResponse => {
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
      total: typeof record.total === "number" ? record.total : undefined,
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
      total: typeof nested.total === "number" ? nested.total : undefined,
      page: typeof nested.page === "number" ? nested.page : undefined,
      limit: typeof nested.limit === "number" ? nested.limit : undefined,
      totalPages:
        typeof nested.totalPages === "number" ? nested.totalPages : undefined,
    };
  }

  return { data: [] };
};

/**
 * Query keys for schedule-related queries
 */
export const scheduleQueryKeys = {
  all: ["schedules"] as const,
  lists: () => [...scheduleQueryKeys.all, "list"] as const,
  list: (filters?: ScheduleFilters) =>
    [...scheduleQueryKeys.lists(), filters] as const,
  details: () => [...scheduleQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...scheduleQueryKeys.details(), id] as const,
  byTopic: (topicId: string) =>
    [...scheduleQueryKeys.all, "topic", topicId] as const,
  byBatch: (batchId: string) =>
    [...scheduleQueryKeys.all, "batch", batchId] as const,
};

/**
 * Create a new schedule
 *
 * @example
 * ```tsx
 * const createSchedule = useCreateSchedule();
 * createSchedule.mutate({
 *   batchId: "...",
 *   subjectId: "...",
 *   title: "Math Class",
 *   scheduledAt: "2025-01-01T10:00:00Z",
 *   duration: 60,
 *   subjectName: "Mathematics"
 * });
 * ```
 */
export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateScheduleData) => {
      const response = await apiClient.post<{ data: Schedule }>(
        "/admin/schedules",
        data
      );
      return response.data.data;
    },
    onSuccess: (newSchedule) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: scheduleQueryKeys.lists(),
      });
      if (newSchedule.batchId) {
        queryClient.invalidateQueries({
          queryKey: scheduleQueryKeys.byBatch(newSchedule.batchId),
        });
      }
      if (newSchedule.topicId) {
        queryClient.invalidateQueries({
          queryKey: scheduleQueryKeys.byTopic(newSchedule.topicId),
        });
      }
    },
  });
};

/**
 * Get all schedules with optional filters
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetSchedules({
 *   page: 1,
 *   limit: 10,
 *   status: "SCHEDULED",
 *   upcoming: true
 * });
 * ```
 */
export const useGetSchedules = (filters?: ScheduleFilters) => {
  return useQuery({
    queryKey: scheduleQueryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.status) params.append("status", filters.status);
      if (filters?.batchId) params.append("batchId", filters.batchId);
      if (filters?.teacherId) params.append("teacherId", filters.teacherId);
      if (filters?.date) params.append("date", filters.date);
      if (filters?.upcoming !== undefined)
        params.append("upcoming", filters.upcoming.toString());

      const response = await apiClient.get<ScheduleListResponse>(
        `/admin/schedules?${params.toString()}`
      );
      return normalizeScheduleListResponse(response.data);
    },
    enabled: tokenManager.isAuthenticated(),
  });
};

/**
 * Get all schedules for a specific topic
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetSchedulesByTopic(topicId);
 * ```
 */
export const useGetSchedulesByTopic = (topicId: string) => {
  return useQuery({
    queryKey: scheduleQueryKeys.byTopic(topicId),
    queryFn: async () => {
      const response = await apiClient.get<ScheduleListResponse>(
        `/admin/schedules/topic/${topicId}`
      );
      return normalizeScheduleListResponse(response.data);
    },
    enabled: !!topicId && tokenManager.isAuthenticated(),
  });
};

/**
 * Get all schedules for a specific batch
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetSchedulesByBatch(batchId);
 * ```
 */
export const useGetSchedulesByBatch = (batchId: string) => {
  return useQuery({
    queryKey: scheduleQueryKeys.byBatch(batchId),
    queryFn: async () => {
      const response = await apiClient.get<ScheduleListResponse>(
        `/admin/schedules/batch/${batchId}`
      );
      return normalizeScheduleListResponse(response.data);
    },
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

/**
 * Get a single schedule by ID
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGetSchedule(scheduleId);
 * ```
 */
export const useGetSchedule = (id: string) => {
  return useQuery({
    queryKey: scheduleQueryKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Schedule }>(
        `/admin/schedules/${id}`
      );
      return response.data.data;
    },
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

export const useGetScheduleJoinToken = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...scheduleQueryKeys.detail(id), "join-token"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ScheduleJoinSession }>(
        `/admin/schedules/${id}/join-token`
      );
      return response.data.data;
    },
    enabled: !!id && enabled && tokenManager.isAuthenticated(),
    staleTime: 60 * 1000,
  });
};

export const useGetScheduleWhiteboard = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...scheduleQueryKeys.detail(id), "whiteboard"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ScheduleWhiteboard }>(
        `/admin/schedules/${id}/whiteboard`
      );
      return response.data.data;
    },
    enabled: !!id && enabled && tokenManager.isAuthenticated(),
    refetchInterval: 4000,
  });
};

export const useUpdateScheduleWhiteboard = () => {
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
        `/admin/schedules/${id}/whiteboard`,
        data
      );
      return response.data.data;
    },
    onSuccess: (whiteboard, variables) => {
      queryClient.setQueryData(
        [...scheduleQueryKeys.detail(variables.id), "whiteboard"],
        whiteboard
      );
      queryClient.invalidateQueries({
        queryKey: [...scheduleQueryKeys.detail(variables.id), "whiteboard"],
      });
    },
  });
};

/**
 * Update a schedule
 *
 * @example
 * ```tsx
 * const updateSchedule = useUpdateSchedule();
 * updateSchedule.mutate({
 *   id: scheduleId,
 *   data: { title: "Updated Title", duration: 90 }
 * });
 * ```
 */
export const useUpdateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateScheduleData;
    }) => {
      const response = await apiClient.patch<{ data: Schedule }>(
        `/admin/schedules/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: (updatedSchedule) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: scheduleQueryKeys.detail(updatedSchedule.id),
      });
      queryClient.invalidateQueries({
        queryKey: scheduleQueryKeys.lists(),
      });
      if (updatedSchedule.batchId) {
        queryClient.invalidateQueries({
          queryKey: scheduleQueryKeys.byBatch(updatedSchedule.batchId),
        });
      }
      if (updatedSchedule.topicId) {
        queryClient.invalidateQueries({
          queryKey: scheduleQueryKeys.byTopic(updatedSchedule.topicId),
        });
      }
    },
  });
};

/**
 * Update schedule status
 *
 * @example
 * ```tsx
 * const updateStatus = useUpdateScheduleStatus();
 * updateStatus.mutate({
 *   id: scheduleId,
 *   status: "COMPLETED"
 * });
 * ```
 */
export const useUpdateScheduleStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: UpdateScheduleStatusData;
    }) => {
      const response = await apiClient.patch<{ data: Schedule }>(
        `/admin/schedules/${id}/status`,
        status
      );
      return response.data.data;
    },
    onSuccess: (updatedSchedule) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: scheduleQueryKeys.detail(updatedSchedule.id),
      });
      queryClient.invalidateQueries({
        queryKey: scheduleQueryKeys.lists(),
      });
      if (updatedSchedule.batchId) {
        queryClient.invalidateQueries({
          queryKey: scheduleQueryKeys.byBatch(updatedSchedule.batchId),
        });
      }
    },
  });
};

/**
 * Delete a schedule
 *
 * @example
 * ```tsx
 * const deleteSchedule = useDeleteSchedule();
 * deleteSchedule.mutate(scheduleId);
 * ```
 */
export const useDeleteSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/schedules/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: scheduleQueryKeys.all,
      });
      // Remove from cache
      queryClient.removeQueries({
        queryKey: scheduleQueryKeys.detail(deletedId),
      });
    },
  });
};

export const useGetScheduleAttendance = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...scheduleQueryKeys.detail(id), "attendance"],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: {
          data: ScheduleAttendance[];
          summary: ScheduleAttendanceSummary;
        };
      }>(
        `/admin/schedules/${id}/attendance`
      );
      return response.data.data;
    },
    enabled: !!id && enabled && tokenManager.isAuthenticated(),
    refetchInterval: 10000,
  });
};

export const useGetScheduleAiSummary = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...scheduleQueryKeys.detail(id), "ai-summary"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: ScheduleAiSummary }>(
        `/admin/schedules/${id}/summary`
      );
      return response.data.data;
    },
    enabled: !!id && enabled && tokenManager.isAuthenticated(),
    refetchInterval: (query) => {
      const summary = query.state.data;
      if (summary?.status === "COMPLETED" && !summary?.summaryGeneratedAt) {
        return 5000;
      }
      return false;
    },
  });
};
