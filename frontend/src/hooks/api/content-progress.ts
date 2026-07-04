"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenManager } from "@/lib/api/client";
import {
  RecentlyWatchedResponse,
  TrackProgressRequest,
  TrackProgressResponse,
  ContentProgressResponse,
  WatchStatsResponse,
  BatchProgressResponse,
  MarkCompleteResponse,
} from "@/lib/types/api";

// ==========================================
// Content Progress API Hooks (Client/Student)
// ==========================================

// Get recently watched videos with progress
export const useRecentlyWatched = (params?: {
  page?: number;
  limit?: number;
  batchId?: string;
  completedOnly?: boolean;
}) => {
  return useQuery<RecentlyWatchedResponse>({
    queryKey: [
      "recentlyWatched",
      params?.page,
      params?.limit,
      params?.batchId,
      params?.completedOnly,
    ],
    queryFn: () => api.getRecentlyWatched(params).then((res) => res.data),
    enabled: tokenManager.isAuthenticated(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

// Track video watch progress
export const useTrackContentProgress = () => {
  const queryClient = useQueryClient();

  return useMutation<
    TrackProgressResponse,
    Error,
    { contentId: string; data: TrackProgressRequest }
  >({
    mutationFn: ({
      contentId,
      data,
    }: {
      contentId: string;
      data: TrackProgressRequest;
    }) => api.trackContentProgress(contentId, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["contentProgress", variables.contentId],
      });
      queryClient.invalidateQueries({ queryKey: ["recentlyWatched"] });
      queryClient.invalidateQueries({ queryKey: ["watchStats"] });
      queryClient.invalidateQueries({ queryKey: ["batchProgress"] });
    },
  });
};

// Get progress for specific content
export const useContentProgress = (contentId: string) => {
  return useQuery<ContentProgressResponse>({
    queryKey: ["contentProgress", contentId],
    queryFn: () => api.getContentProgress(contentId).then((res) => res.data),
    enabled: !!contentId && tokenManager.isAuthenticated(),
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Get overall watch statistics
export const useWatchStats = (params?: { batchId?: string }) => {
  return useQuery<WatchStatsResponse>({
    queryKey: ["watchStats", params?.batchId],
    queryFn: () => api.getWatchStats(params).then((res) => res.data),
    enabled: tokenManager.isAuthenticated(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Mark content as completed manually
export const useMarkContentComplete = () => {
  const queryClient = useQueryClient();

  return useMutation<MarkCompleteResponse, Error, string>({
    mutationFn: (contentId: string) =>
      api.markContentComplete(contentId).then((res) => res.data),
    onSuccess: (_, contentId) => {
      queryClient.setQueryData<ContentProgressResponse | undefined>(
        ["contentProgress", contentId],
        (current) => {
          if (!current?.data) {
            return current;
          }

          return {
            ...current,
            data: {
              ...current.data,
              isCompleted: true,
              watchPercentage: 100,
            },
          };
        }
      );

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["contentProgress", contentId],
      });
      queryClient.invalidateQueries({ queryKey: ["recentlyWatched"] });
      queryClient.invalidateQueries({ queryKey: ["watchStats"] });
      queryClient.invalidateQueries({ queryKey: ["batchProgress"] });
    },
  });
};

// Get batch progress overview
export const useBatchProgress = (batchId: string) => {
  return useQuery<BatchProgressResponse>({
    queryKey: ["batchProgress", batchId],
    queryFn: () => api.getBatchProgress(batchId).then((res) => res.data),
    enabled: !!batchId && tokenManager.isAuthenticated(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

