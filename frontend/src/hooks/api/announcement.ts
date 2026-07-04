"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "./query-keys";

export const useGetAnnouncements = () => {
  return useQuery({
    queryKey: queryKeys.announcements,
    queryFn: () =>
      apiClient.get("/admin/announcements").then((res) => res.data),
    enabled: true,
  });
};

export const useCreateAnnouncement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      subject: string;
      contentHtml: string;
      audienceType: "ORGANIZATION" | "COURSE";
      batchId?: string;
    }) => apiClient.post("/admin/announcements", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements });
    },
  });
};

