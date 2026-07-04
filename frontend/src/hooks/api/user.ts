"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
import { queryKeys } from "./query-keys";

// User Management Hooks
export const useGetAllUsers = () => {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => apiClient.get("/admin/users").then((res) => res.data),
    enabled: !!tokenManager.getToken(),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/admin/users/${userId}`).then((res) => res.data),
    onSuccess: () => {
      // Invalidate users query to refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
};

export const useInviteAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      organizationId: string;
      email: string;
      username: string;
    }) => apiClient.post("/admin/auth/register", data).then((res) => res.data),
    onSuccess: () => {
      // Invalidate users query to refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
    },
  });
};

