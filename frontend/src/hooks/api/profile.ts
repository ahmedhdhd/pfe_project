"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenManager } from "@/lib/api/client";
import { queryKeys } from "./query-keys";

// ==========================================
// Profile API Hooks (Client/Student)
// ==========================================

// Profile type with all fields
export interface Profile {
  id: string;
  organizationId: string;
  email: string;
  username: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  isVerified: boolean;
  createdAt: string;
  profileImg?: string;
  gender?: "Male" | "Female" | "Other";
  phoneNumber?: string;
  address?: {
    city?: string;
    state?: string;
    pincode?: string;
  };
}

// Get user profile
export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile().then((res) => res.data),
    enabled: tokenManager.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update user profile
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      username?: string;
      profileImg?: string;
      gender?: "Male" | "Female" | "Other";
      phoneNumber?: string;
      address?: {
        city?: string;
        state?: string;
        pincode?: string;
      };
    }) => api.updateProfile(data).then((res) => res.data),
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Update profile cache
        queryClient.setQueryData(["profile"], data);
        // Invalidate to refetch fresh data
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        // Also update user cache if it exists
        queryClient.setQueryData(queryKeys.user, data.data);
        queryClient.invalidateQueries({ queryKey: queryKeys.user });
      }
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
    },
  });
};


