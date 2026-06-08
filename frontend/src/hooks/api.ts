"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, tokenManager } from "@/lib/api/client";
import apiClient from "@/lib/api/client";
import { setCachedConfig } from "@/lib/config/cache";
import type { ContentBlockDocument } from "@/lib/content-blocks";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import {
  ApiResponse,
  Organization,
  LoginResponse,
  CreateOrganizationConfigData,
  CreateOrganizationConfigResponse,
  OrderHistoryResponse,
  RecentlyWatchedResponse,
  TrackProgressRequest,
  TrackProgressResponse,
  ContentProgressResponse,
  WatchStatsResponse,
  BatchProgressResponse,
  MarkCompleteResponse,
  BatchReviewsResponse,
} from "@/lib/types/api";
import { useRouter } from "next/navigation";

// Query Keys
export const queryKeys = {
  user: ["user"] as const,
  organization: ["organization"] as const,
  organizationConfig: (slug: string) => ["organizationConfig", slug] as const,
  emailAvailability: (email: string) => ["emailAvailability", email] as const,
  users: ["users"] as const,
  batches: ["batches"] as const,
  batch: (id: string) => ["batch", id] as const,
  batchReviews: (id: string) => ["batch", id, "reviews"] as const,
  categories: ["categories"] as const,
  announcements: ["announcements"] as const,
  teachers: ["teachers"] as const,
};

// Auth Hooks
export const useLogin = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      try {
        const response = await api.login(data);
        const result = response.data;

        // If login failed, throw error with API message
        if (!result.success) {
          const error = new Error(result.message) as Error & {
            response?: { data?: { message?: string } };
          };
          error.response = { data: { message: result.message } };
          throw error;
        }

        return result;
      } catch (error: unknown) {
        // If it's an axios error, preserve the structure
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message
        ) {
          throw error; // Already has the correct structure
        }
        // If it's our thrown error, re-throw it
        if (error && typeof error === "object" && "message" in error) {
          throw error;
        }
        // Otherwise, wrap it
        const errorMessage =
          error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : "Login failed. Please try again.";
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data: ApiResponse<LoginResponse>) => {
      if (data.success && data.data) {
        // Store access + refresh so 401 interceptor can rotate tokens (backend sends refreshToken)
        tokenManager.setAuthData(
          data.data.token,
          data.data.user,
          data.data.refreshToken
        );

        // Update user cache
        queryClient.setQueryData(queryKeys.user, data.data.user);

        // Redirect to dashboard
        router.push("/admin/dashboard");
      }
    },
    onError: (error) => {
      console.error("Login failed:", error);
      // Don't throw here, let the component handle it
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // Clear auth data
      tokenManager.clearAuthData();
      // Clear all cached data
      queryClient.clear();
    },
    onSuccess: () => {
      router.push("/login");
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => {
      if (!tokenManager.isAuthenticated()) {
        throw new Error("Not authenticated");
      }
      // Get user data from cookie
      const user = tokenManager.getUser();
      if (!user) {
        throw new Error("User data not found");
      }
      return user;
    },
    enabled: tokenManager.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

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

// Auth Registration Hooks
export const useRegister = () => {
  return useMutation({
    mutationFn: (data: {
      organizationId: string;
      email: string;
      username: string;
    }) => api.register(data).then((res) => res.data),
    onError: (error) => {
      console.error("Registration failed:", error);
    },
  });
};

export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      api.verifyEmail(data).then((res) => res.data),
    onError: (error) => {
      console.error("Email verification failed:", error);
    },
  });
};

export const useSetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      api.setPassword(data).then((res) => res.data),
    onSuccess: (data: ApiResponse<{ message: string }>) => {
      if (data.success) {
        // Clear any cached auth data
        queryClient.invalidateQueries({ queryKey: queryKeys.user });
      }
    },
    onError: (error) => {
      console.error("Set password failed:", error);
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      api.resendVerification(data).then((res) => res.data),
    onError: (error) => {
      console.error("Resend verification failed:", error);
    },
  });
};

// Student Authentication Hooks
export const useStudentRegister = () => {
  return useMutation({
    mutationFn: (data: {
      organizationId: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }) => api.studentRegister(data).then((res) => res.data),
    onError: (error) => {
      console.error("Student registration failed:", error);
    },
  });
};

export const useStudentVerifyEmail = () => {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      api.studentVerifyEmail(data).then((res) => res.data),
    onError: (error) => {
      console.error("Student email verification failed:", error);
    },
  });
};

export const useStudentSetPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; password: string }) =>
      api.studentSetPassword(data).then((res) => res.data),
    onSuccess: (data: ApiResponse<{ message: string }>) => {
      if (data.success) {
        // Clear any cached auth data
        queryClient.invalidateQueries({ queryKey: queryKeys.user });
      }
    },
    onError: (error) => {
      console.error("Student set password failed:", error);
    },
  });
};

export const useStudentLogin = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { email: string; password: string; organizationId: string }) =>
      api.studentLogin(data).then((res) => res.data),
    onSuccess: (data: ApiResponse<LoginResponse>) => {
      if (data.success && data.data) {
        tokenManager.setAuthData(
          data.data.token,
          data.data.user,
          data.data.refreshToken
        );

        queryClient.setQueryData(queryKeys.user, data.data.user);

        router.push("/student/my-learning");
      }
    },
    onError: (error) => {
      console.error("Student login failed:", error);
    },
  });
};

export const useStudentResendVerification = () => {
  return useMutation({
    mutationFn: (data: { email: string; organizationId: string }) =>
      api.studentResendVerification(data).then((res) => res.data),
    onError: (error) => {
      console.error("Student resend verification failed:", error);
    },
  });
};

export const useStudentForgotPassword = () => {
  return useMutation({
    mutationFn: (data: { email: string; organizationId: string }) =>
      api.studentForgotPassword(data).then((res) => res.data),
    onError: (error) => {
      console.error("Student forgot password failed:", error);
    },
  });
};

export const useStudentResetPassword = () => {
  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      api.studentResetPassword(data).then((res) => res.data),
    onError: (error) => {
      console.error("Student reset password failed:", error);
    },
  });
};

// OTP Authentication Hooks
export const useGetOtp = () => {
  return useMutation({
    mutationFn: async (data: {
      countryCode: string;
      phoneNumber: string;
      organizationId: string;
    }) => {
      try {
        const res = await api.getOtp(data);
        return res.data;
      } catch (error: unknown) {
        // Handle 400 response for new users - this is expected behavior
        // API returns 400 with success: false but isExistingUser: false when OTP is sent to new user
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response
        ) {
          const responseData = error.response.data as {
            success?: boolean;
            data?: { isExistingUser?: boolean };
            message?: string;
          };

          // If this is the expected 400 response for new users, return it as success
          if (
            responseData.data?.isExistingUser === false ||
            responseData.message?.toLowerCase().includes("new user") ||
            responseData.message?.toLowerCase().includes("registered")
          ) {
            return responseData;
          }
        }
        // Re-throw other errors
        throw error;
      }
    },
    onError: (error) => {
      console.error("Get OTP failed:", error);
    },
  });
};

export const useVerifyOtp = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: {
      countryCode: string;
      phoneNumber: string;
      otp: string;
      organizationId: string;
    }) => api.verifyOtp(data).then((res) => res.data),
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Store complete auth data (token + refreshToken + user) in QUEZT_AUTH cookie
        tokenManager.setAuthData(
          data.data.accessToken,
          data.data.user,
          data.data.refreshToken
        );

        // Update user cache
        queryClient.setQueryData(queryKeys.user, data.data.user);
      }
    },
    onError: (error) => {
      console.error("Verify OTP failed:", error);
    },
  });
};

export const useRefreshToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { refreshToken: string }) =>
      (tokenManager.getUser()?.role === "STUDENT"
        ? api.refreshToken(data)
        : api.adminRefreshToken(data)
      ).then((res) => res.data),
    onSuccess: (data) => {
      if (data.success && data.data) {
        // Update token in auth data
        const authData = tokenManager.getAuthData();
        if (authData && authData.user) {
          tokenManager.setAuthData(
            data.data.accessToken,
            authData.user,
            data.data.refreshToken || authData.refreshToken
          );
        }
        // Admin refresh does not include user; optional when present
        if ("user" in data.data && data.data.user) {
          queryClient.setQueryData(queryKeys.user, data.data.user);
        }
      }
    },
    onError: (error) => {
      console.error("Refresh token failed:", error);
      // If refresh fails, clear auth and redirect to login
      tokenManager.clearAuthData();
      queryClient.clear();
    },
  });
};

export const useInviteTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; username: string }) =>
      api.inviteUser(data).then((res) => res.data),
    onSuccess: (data) => {
      if (data.success) {
        // Invalidate users query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["users"] });
        // You could also show a success toast here
        console.log("Teacher invited successfully:", data.data);
      }
    },
    onError: (error) => {
      console.error("Invite user failed:", error);
    },
  });
};

// Utility hook for authentication state
export const useAuth = () => {
  const { data: user, isLoading, error } = useCurrentUser();

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
  };
};

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

// Batch Management Hooks
export const useGetAllBatches = () => {
  return useQuery({
    queryKey: queryKeys.batches,
    queryFn: () => apiClient.get("/admin/batches").then((res) => res.data),
    enabled: true,
  });
};

export const useGetCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => apiClient.get("/admin/categories").then((res) => res.data),
    enabled: true,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; icon?: string; parentId?: string | null }) =>
      apiClient.post("/admin/categories", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name: string; icon?: string; parentId?: string | null };
    }) => apiClient.put(`/admin/categories/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/categories/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

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

export const useGetBatch = (id: string) => {
  return useQuery({
    queryKey: queryKeys.batch(id),
    queryFn: () =>
      apiClient.get(`/admin/batches/${id}`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useGetBatchReviewsAdmin = (id: string) => {
  return useQuery<BatchReviewsResponse>({
    queryKey: queryKeys.batchReviews(id),
    queryFn: () =>
      apiClient.get(`/admin/batches/${id}/reviews`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateBatch = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description: string;
      class?: string;
      exam?: string;
      categoryId?: string;
      imageUrl?: string;
      introVideoUrl?: string;
      introVideoType?: string;
      startDate: string;
      endDate: string;
      language: string;
      level?: string;
      totalPrice: number;
      discountPercentage: number;
      faq: Array<{
        title: string;
        description: string;
      }>;
    }) => apiClient.post("/admin/batches", data).then((res) => res.data),
    onSuccess: (created) => {
      // Invalidate batches query to refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
      // Redirect to created batch detail when possible
      const extractId = (payload: unknown): string | undefined => {
        if (!payload || typeof payload !== "object") return undefined;
        const maybeWithData = payload as { data?: unknown; id?: unknown };
        if (maybeWithData.data && typeof maybeWithData.data === "object") {
          const inner = maybeWithData.data as { id?: unknown };
          if (typeof inner.id === "string") return inner.id;
        }
        if (typeof maybeWithData.id === "string") return maybeWithData.id;
        return undefined;
      };
      const createdId = extractId(created);
      if (createdId) {
        router.push(`/admin/courses/${createdId}`);
      } else {
        router.push("/admin/courses");
      }
    },
  });
};

export const useUpdateBatch = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        description: string;
        class?: string;
        exam?: string;
        categoryId?: string;
        imageUrl?: string;
        introVideoUrl?: string;
        introVideoType?: string;
        startDate: string;
        endDate: string;
        language: string;
        level?: string;
        totalPrice: number;
        discountPercentage: number;
        faq: Array<{
          title: string;
          description: string;
        }>;
        teacherId?: string;
      };
    }) => apiClient.put(`/admin/batches/${id}`, data).then((res) => res.data),
    onSuccess: (data, variables) => {
      // Invalidate both batches list and specific batch
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
      queryClient.invalidateQueries({
        queryKey: queryKeys.batch(variables.id),
      });
      // Redirect to updated batch detail page
      router.push(`/admin/courses/${variables.id}`);
    },
  });
};

export interface BatchCertificateConfigPayload {
  enabled: boolean;
  title?: string;
  heading?: string;
  templateId?: string;
  issuerName?: string;
  signerName?: string;
  signerTitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  linkedInOrgId?: string;
}

export interface BatchCertificateIssuePayload {
  id: string;
  credentialId: string;
  batchId: string;
  userId: string;
  recipientName: string;
  batchName: string;
  certificateTitle?: string | null;
  heading?: string | null;
  templateId?: string | null;
  issuerName?: string | null;
  signerName?: string | null;
  signerTitle?: string | null;
  linkedInOrgId?: string | null;
  organizationName?: string | null;
  organizationSlug?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  progressPercentage: number;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchCertificateStatusPayload {
  batchId: string;
  batchName: string;
  configured: boolean;
  eligible: boolean;
  isCompleted: boolean;
  config: BatchCertificateConfigPayload;
  certificate?: BatchCertificateIssuePayload | null;
  progress: {
    totalVideos: number;
    completedVideos: number;
    progressPercentage: number;
    totalWatchTimeSeconds: number;
    isCompleted: boolean;
  };
}

export const useUpdateBatchCertificateConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: BatchCertificateConfigPayload;
    }) =>
      apiClient
        .put(`/admin/batches/${id}/certificate`, data)
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.batch(variables.id) });
      queryClient.invalidateQueries({ queryKey: ["explore", "batch", variables.id] });
    },
  });
};

export const useDeleteBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/batches/${id}`).then((res) => res.data),
    onSuccess: () => {
      // Invalidate batches query to refetch the list
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

// Teacher Management Hooks
export const useCreateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      batchIds: string[];
      highlights: Record<string, unknown>;
      imageUrl?: string;
      subjects: string[];
    }) => apiClient.post("/admin/teachers", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
};

export const useGetAllTeachers = () => {
  return useQuery({
    queryKey: ["teachers", "all"],
    queryFn: () => apiClient.get(`/admin/teachers`).then((res) => res.data),
  });
};

export const useGetTeachersByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["teachers", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/admin/teachers/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId,
  });
};

export const useUpdateTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        highlights: Record<string, unknown>;
        imageUrl?: string;
        subjects: string[];
        batchId?: string;
      };
    }) => apiClient.put(`/admin/teachers/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
};

export const useDeleteTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/teachers/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
};

export const useAssignTeacherToBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teacherId,
      batchId,
    }: {
      teacherId: string;
      batchId: string;
    }) =>
      apiClient
        .post(`/admin/teachers/${teacherId}/batches/${batchId}`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

export const useRemoveTeacherFromBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      teacherId,
      batchId,
    }: {
      teacherId: string;
      batchId: string;
    }) =>
      apiClient
        .delete(`/admin/teachers/${teacherId}/batches/${batchId}`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    },
  });
};

// File Upload Hooks (Admin)
export const useGenerateSignedUrl = () => {
  return useMutation({
    mutationFn: (data: {
      fileName: string;
      fileType: string;
      fileSize: number;
      folder: string;
    }) =>
      apiClient.post("/admin/upload/signed-url", data).then((res) => res.data),
  });
};

export const useDirectUpload = () => {
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient
        .post("/admin/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((res) => res.data),
  });
};

// File Upload Hooks (Client/Student)
export const useClientGenerateSignedUrl = () => {
  return useMutation({
    mutationFn: (data: {
      fileName: string;
      fileType: string;
      fileSize: number;
      folder: string;
    }) => api.generateSignedUrl(data).then((res) => res.data),
  });
};

export const useClientDirectUpload = () => {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api.directUpload(formData).then((res) => res.data),
  });
};

// ==========================================
// Subjects API Hooks
// ==========================================

// Subject query keys (using inline arrays for now)

// Create Subject
export const useCreateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      batchId: string;
      thumbnailUrl?: string;
    }) => apiClient.post("/admin/subjects", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};

// Get Subjects by Batch
export const useGetSubjectsByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["subjects", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/admin/subjects/batch/${batchId}`).then((res) => res.data),
  });
};

export const useGetCourseHierarchy = (batchId: string) => {
  return useQuery({
    queryKey: ["course-hierarchy", batchId],
    queryFn: () =>
      apiClient
        .get(`/admin/subjects/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseHierarchyPayload(res.data)),
    enabled: !!batchId && batchId.trim() !== "",
  });
};

export const useGetClientCourseHierarchy = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "course-hierarchy", batchId],
    queryFn: () =>
      apiClient
        .get(`/api/subjects/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseHierarchyPayload(res.data)),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

export const useGetChaptersByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["chapters", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/admin/chapters/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && batchId.trim() !== "",
  });
};

export const useGetCourseOutline = (batchId: string) => {
  return useQuery({
    queryKey: ["course-outline", batchId],
    queryFn: () =>
      apiClient
        .get(`/admin/chapters/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseOutlinePayload(res.data)),
    enabled: !!batchId && batchId.trim() !== "",
  });
};

export const useGetClientChaptersByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "chapters", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/api/chapters/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

export const useGetClientCourseOutline = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "course-outline", batchId],
    queryFn: () =>
      apiClient
        .get(`/api/chapters/batch/${batchId}/hierarchy`)
        .then((res) => normalizeCourseOutlinePayload(res.data)),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

// Get Subject by ID
export const useGetSubject = (id: string) => {
  return useQuery({
    queryKey: ["subjects", id],
    queryFn: () =>
      apiClient.get(`/admin/subjects/${id}`).then((res) => res.data),
  });
};

// Update Subject
export const useUpdateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name: string;
        thumbnailUrl?: string;
      };
    }) => apiClient.put(`/admin/subjects/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({
        queryKey: ["subjects", variables.id],
      });
    },
  });
};

// Delete Subject
export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/subjects/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
  });
};

// ==========================================
// Chapters API Hooks
// ==========================================

// Create Chapter
export const useCreateChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; subjectId?: unknown; batchId?: unknown }) => {
      const payload: { name: string; subjectId?: string; batchId?: string } = {
        name: data.name,
      };

      if (typeof data.subjectId === "string" && data.subjectId.trim()) {
        payload.subjectId = data.subjectId;
      }

      if (typeof data.batchId === "string" && data.batchId.trim()) {
        payload.batchId = data.batchId;
      }

      return apiClient.post("/admin/chapters", payload).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });
};

// Get Chapters by Subject
export const useGetChaptersBySubject = (subjectId: string) => {
  return useQuery({
    queryKey: ["chapters", "subject", subjectId],
    queryFn: () =>
      apiClient
        .get(`/admin/chapters/subject/${subjectId}`)
        .then((res) => res.data),
    enabled: !!subjectId && subjectId.trim() !== "",
  });
};

// Get Chapter by ID
export const useGetChapter = (id: string) => {
  return useQuery({
    queryKey: ["chapters", id],
    queryFn: () =>
      apiClient.get(`/admin/chapters/${id}`).then((res) => res.data),
  });
};

// Update Chapter
export const useUpdateChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      apiClient.put(`/admin/chapters/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({
        queryKey: ["chapters", variables.id],
      });
    },
  });
};

// Delete Chapter
export const useDeleteChapter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/chapters/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
    },
  });
};

// ==========================================
// Topics API Hooks
// ==========================================

export type TopicQuizQuestionType =
  | "MCQ"
  | "TRUE_FALSE";

export interface TopicQuizOption {
  id: string;
  text: string;
}

export interface TopicQuizQuestion {
  id: string;
  text: string;
  type: TopicQuizQuestionType;
  explanation?: string;
  options?: TopicQuizOption[];
  correctOptionId?: string;
  correctText?: string;
  correctNumber?: number;
}

export interface TopicQuiz {
  title?: string;
  description?: string;
  passingPercentage: number;
  questions: TopicQuizQuestion[];
}

export interface TopicQuizQuestionResult {
  questionId: string;
  questionText: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
}

export interface TopicQuizAttemptSummary {
  id: string;
  attemptNumber: number;
  score: number;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  isPassed: boolean;
  completedAt: string;
  questionResults?: TopicQuizQuestionResult[];
}

// Create Topic
export const useCreateTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; chapterId: string }) =>
      apiClient.post("/admin/topics", data).then((res) => res.data),
    onSuccess: (data, variables) => {
      // Invalidate all topics queries and specifically the chapter topics
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({
        queryKey: ["topics", "chapter", variables.chapterId],
      });
    },
  });
};

// Get Topics by Chapter
export const useGetTopicsByChapter = (chapterId: string) => {
  return useQuery({
    queryKey: ["topics", "chapter", chapterId],
    queryFn: () =>
      apiClient
        .get(`/admin/topics/chapter/${chapterId}`)
        .then((res) => res.data),
    enabled: !!chapterId && chapterId.trim() !== "",
  });
};

// Get Topic by ID
export const useGetTopic = (id: string) => {
  return useQuery({
    queryKey: ["topics", id],
    queryFn: () => apiClient.get(`/admin/topics/${id}`).then((res) => res.data),
  });
};

// Update Topic
export const useUpdateTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string } }) =>
      apiClient.put(`/admin/topics/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({
        queryKey: ["topics", variables.id],
      });
    },
  });
};

export const useUpdateTopicQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, quiz }: { id: string; quiz: TopicQuiz }) =>
      apiClient.put(`/admin/topics/${id}/quiz`, { quiz }).then((res) => res.data),
    onSuccess: (response, variables) => {
      const nextQuiz =
        response &&
        typeof response === "object" &&
        "data" in response &&
        response.data &&
        typeof response.data === "object" &&
        "quiz" in response.data
          ? ((response.data as { quiz?: TopicQuiz | null }).quiz ?? variables.quiz)
          : variables.quiz;

      queryClient.setQueriesData(
        { queryKey: ["course-outline"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            variables.id,
            nextQuiz
          )
      );
      queryClient.setQueriesData(
        { queryKey: ["course-hierarchy"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            variables.id,
            nextQuiz
          )
      );
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
      queryClient.invalidateQueries({ queryKey: ["topics", variables.id] });
      queryClient.invalidateQueries({
        queryKey: ["client", "course-hierarchy"],
      });
    },
  });
};

export const useDeleteTopicQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/topics/${id}/quiz`).then((res) => res.data),
    onSuccess: (_, id) => {
      queryClient.setQueriesData(
        { queryKey: ["course-outline"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            id,
            null
          )
      );
      queryClient.setQueriesData(
        { queryKey: ["course-hierarchy"] },
        (current) =>
          patchTopicQuizInHierarchyPayload(
            current as { data?: unknown },
            id,
            null
          )
      );
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
      queryClient.invalidateQueries({ queryKey: ["topics", id] });
      queryClient.invalidateQueries({
        queryKey: ["client", "course-hierarchy"],
      });
    },
  });
};

export const useSubmitTopicQuizAttempt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicId,
      answers,
    }: {
      topicId: string;
      answers: Record<string, unknown>;
    }) =>
      apiClient
        .post(`/api/topics/${topicId}/quiz-attempts`, { answers })
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["topics", variables.topicId] });
      queryClient.invalidateQueries({
        queryKey: ["client", "course-hierarchy"],
      });
    },
  });
};

// Delete Topic
export const useDeleteTopic = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/topics/${id}`).then((res) => res.data),
    onSuccess: () => {
      // Invalidate all topics queries
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });
};

// ==========================================
// Contents API Hooks
// ==========================================

interface ContentData {
  title: string;
  name?: string;
  description?: string;
  topicId?: string;
  body?: ContentBlockDocument | null;
  type: "Lecture" | "PDF" | "MARKDOWN" | "URL" | "PLAYGROUND";
  pdfUrl?: string;
  markdownBody?: string;
  externalUrl?: string;
  externalProvider?: string;
  playgroundId?: string;
  videoUrl?: string;
  videoType?: "YOUTUBE" | "HLS";
  videoThumbnail?: string;
  videoDuration?: number;
}

const normalizeContentItem = <T extends Record<string, unknown>>(content: T) => ({
  ...content,
  name:
    typeof content.name === "string" && content.name.trim() !== ""
      ? content.name
      : typeof content.title === "string"
      ? content.title
      : "",
});

const normalizeContentPayload = <T extends { data?: unknown }>(payload: T): T => {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return {
      ...payload,
      data: payload.data.map((item) =>
        item && typeof item === "object"
          ? normalizeContentItem(item as Record<string, unknown>)
          : item
      ),
    } as T;
  }

  if (payload.data && typeof payload.data === "object") {
    return {
      ...payload,
      data: normalizeContentItem(payload.data as Record<string, unknown>),
    } as T;
  }

  return payload;
};

const normalizeCourseHierarchyPayload = <T extends { data?: unknown }>(
  payload: T
): T => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    return payload;
  }

  return {
    ...payload,
    data: payload.data.map((subject) => {
      if (!subject || typeof subject !== "object") {
        return subject;
      }

      const subjectRecord = subject as Record<string, unknown>;

      return {
        ...subjectRecord,
        chapters: Array.isArray(subjectRecord.chapters)
          ? subjectRecord.chapters.map((chapter) => {
              if (!chapter || typeof chapter !== "object") {
                return chapter;
              }

              const chapterRecord = chapter as Record<string, unknown>;

              return {
                ...chapterRecord,
                topics: Array.isArray(chapterRecord.topics)
                  ? chapterRecord.topics.map((topic) => {
                      if (!topic || typeof topic !== "object") {
                        return topic;
                      }

                      const topicRecord = topic as Record<string, unknown>;

                      return {
                        ...topicRecord,
                        contents: Array.isArray(topicRecord.contents)
                          ? topicRecord.contents.map((content) =>
                              content && typeof content === "object"
                                ? normalizeContentItem(
                                    content as Record<string, unknown>
                                  )
                                : content
                            )
                          : [],
                      };
                    })
                  : [],
              };
            })
          : [],
      };
    }),
  } as T;
};

const normalizeCourseOutlinePayload = <T extends { data?: unknown }>(
  payload: T
): T => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    return payload;
  }

  return {
    ...payload,
    data: payload.data.map((chapter) => {
      if (!chapter || typeof chapter !== "object") {
        return chapter;
      }

      const chapterRecord = chapter as Record<string, unknown>;

      return {
        ...chapterRecord,
        topics: Array.isArray(chapterRecord.topics)
          ? chapterRecord.topics.map((topic) => {
              if (!topic || typeof topic !== "object") {
                return topic;
              }

              const topicRecord = topic as Record<string, unknown>;

              return {
                ...topicRecord,
                contents: Array.isArray(topicRecord.contents)
                  ? topicRecord.contents.map((content) =>
                      content && typeof content === "object"
                        ? normalizeContentItem(content as Record<string, unknown>)
                        : content
                    )
                  : [],
              };
            })
          : [],
      };
    }),
  } as T;
};

const patchTopicQuizInHierarchyNode = (
  node: unknown,
  topicId: string,
  quiz: TopicQuiz | null
): unknown => {
  if (!node || typeof node !== "object") {
    return node;
  }

  const record = node as Record<string, unknown>;

  if (record.id === topicId && Array.isArray(record.contents)) {
    return {
      ...record,
      quiz,
    };
  }

  if (Array.isArray(record.topics)) {
    return {
      ...record,
      topics: record.topics.map((topic) =>
        patchTopicQuizInHierarchyNode(topic, topicId, quiz)
      ),
    };
  }

  if (Array.isArray(record.chapters)) {
    return {
      ...record,
      chapters: record.chapters.map((chapter) =>
        patchTopicQuizInHierarchyNode(chapter, topicId, quiz)
      ),
    };
  }

  return record;
};

const patchTopicQuizInHierarchyPayload = <T extends { data?: unknown }>(
  payload: T,
  topicId: string,
  quiz: TopicQuiz | null
): T => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    return payload;
  }

  return {
    ...payload,
    data: payload.data.map((item) =>
      patchTopicQuizInHierarchyNode(item, topicId, quiz)
    ),
  } as T;
};

// Create Content
export const useCreateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ContentData) =>
      apiClient.post("/admin/contents", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
    },
  });
};

// Get Contents by Topic
// Note: Both admin and teacher use the same /admin/ endpoint
export const useGetContentsByTopic = (topicId: string) => {
  return useQuery({
    queryKey: ["contents", "topic", topicId],
    queryFn: () =>
      apiClient
        .get(`/admin/contents/topic/${topicId}`)
        .then((res) => normalizeContentPayload(res.data)),
    enabled: !!topicId, // Only fetch if topicId is provided
  });
};

// Get Content by ID
export const useGetContent = (id: string) => {
  return useQuery({
    queryKey: ["contents", id],
    queryFn: () =>
      apiClient
        .get(`/admin/contents/${id}`)
        .then((res) => normalizeContentPayload(res.data)),
  });
};

// Update Content
export const useUpdateContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContentData> }) =>
      apiClient.put(`/admin/contents/${id}`, data).then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({
        queryKey: ["contents", variables.id],
      });
    },
  });
};

// Delete Content
export const useDeleteContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/contents/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
    },
  });
};

export const useReorderContents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      topicId,
      orderedContentIds,
    }: {
      topicId: string;
      orderedContentIds: string[];
    }) =>
      apiClient
        .put(`/admin/contents/topic/${topicId}/reorder`, { orderedContentIds })
        .then((res) => normalizeContentPayload(res.data)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({
        queryKey: ["contents", "topic", variables.topicId],
      });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

// ==========================================
// Assignments API Hooks
// ==========================================

export type AssignmentQuestionType =
  | "QUIZ"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "FILE_SUBMISSION";

export type AssignmentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type AssignmentQuestionLevel = "EASY" | "MEDIUM" | "HARD";
export type AssignmentSubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "GRADED"
  | "RETURNED";

export interface AssignmentQuestionOption {
  id: string;
  text: string;
}

export interface AssignmentQuestion {
  id: string;
  assignmentId: string;
  type: AssignmentQuestionType;
  title?: string | null;
  prompt: string;
  optionsJson?: AssignmentQuestionOption[];
  options?: AssignmentQuestionOption[];
  correctAnswerJson?: Record<string, unknown>;
  points: number;
  order: number;
}

export interface Assignment {
  id: string;
  organizationId: string;
  batchId: string;
  topicId?: string | null;
  title: string;
  description?: string | null;
  status: AssignmentStatus;
  order: number;
  dueAt?: string | null;
  batch?: { id: string; name: string };
  topic?: { id: string; name: string } | null;
  questions?: AssignmentQuestion[];
  _count?: { questions?: number; submissions?: number };
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  answersJson?: Record<string, unknown>;
  score?: number | null;
  maxScore?: number | null;
  status: AssignmentSubmissionStatus;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  student?: { id: string; username: string; email?: string; profileImg?: string };
  aiFeedback?: AssignmentAiFeedback | null;
}

export interface AssignmentAiFeedback {
  id: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  batchId: string;
  scorePercent?: number | null;
  weakConceptsJson?: unknown[];
  strengthsJson?: unknown[];
  recommendationsJson?: unknown[];
  questionFeedbackJson?: Array<{
    questionId?: string;
    isCorrect?: boolean | null;
    feedback?: string;
    whyCorrectAnswer?: string;
    studyHint?: string;
  }>;
  feedbackText: string;
  generatedAt: string;
}

export const assignmentKeys = {
  all: ["assignments"] as const,
  list: (params?: { batchId?: string; topicId?: string }) =>
    ["assignments", "list", params?.batchId || "", params?.topicId || ""] as const,
  detail: (id: string) => ["assignments", id] as const,
  submissions: (assignmentId: string) =>
    ["assignments", assignmentId, "submissions"] as const,
  analytics: (assignmentId: string) =>
    ["assignments", assignmentId, "analytics"] as const,
};

export const useGetAssignments = (params?: {
  batchId?: string;
  topicId?: string;
}) => {
  return useQuery({
    queryKey: assignmentKeys.list(params),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Assignment[] }>("/admin/assignments", {
          params,
        })
        .then((res) => res.data),
  });
};

export const useGetAssignment = (id?: string) => {
  return useQuery({
    queryKey: assignmentKeys.detail(id || ""),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Assignment }>(`/admin/assignments/${id}`)
        .then((res) => res.data),
    enabled: !!id,
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      batchId: string;
      topicId?: string;
      title: string;
      description?: string;
      status?: AssignmentStatus;
    }) =>
      apiClient
        .post<{ success: boolean; data: Assignment }>("/admin/assignments", data)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<Assignment, "title" | "description" | "status" | "dueAt">>;
    }) =>
      apiClient
        .put<{ success: boolean; data: Assignment }>(
          `/admin/assignments/${id}`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.detail(variables.id) });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/assignments/${id}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

export const useCreateAssignmentQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      data,
    }: {
      assignmentId: string;
      data: {
        type: AssignmentQuestionType;
        title?: string;
        prompt?: string;
        points?: number;
        options?: AssignmentQuestionOption[];
        correctAnswer?: Record<string, unknown>;
      };
    }) =>
      apiClient
        .post<{ success: boolean; data: AssignmentQuestion }>(
          `/admin/assignments/${assignmentId}/questions`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useGenerateAssignmentWithAi = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      prompt,
      count,
      level,
    }: {
      assignmentId: string;
      prompt: string;
      count?: number;
      level?: AssignmentQuestionLevel;
    }) =>
      apiClient
        .post<{ success: boolean; data: { questions: AssignmentQuestion[] } }>(
          `/admin/assignments/${assignmentId}/generate`,
          { prompt, count, level }
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
      queryClient.invalidateQueries({ queryKey: ["course-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["course-outline"] });
    },
  });
};

export const useUpdateAssignmentQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      questionId,
      data,
    }: {
      assignmentId: string;
      questionId: string;
      data: Partial<{
        type: AssignmentQuestionType;
        title: string;
        prompt: string;
        points: number;
        options: AssignmentQuestionOption[];
        correctAnswer: Record<string, unknown>;
      }>;
    }) =>
      apiClient
        .put<{ success: boolean; data: AssignmentQuestion }>(
          `/admin/assignments/questions/${questionId}`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useDeleteAssignmentQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      questionId,
    }: {
      assignmentId: string;
      questionId: string;
    }) =>
      apiClient
        .delete(`/admin/assignments/questions/${questionId}`)
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useGetAssignmentSubmissions = (assignmentId?: string) => {
  return useQuery({
    queryKey: assignmentKeys.submissions(assignmentId || ""),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: AssignmentSubmission[] }>(
          `/admin/assignments/${assignmentId}/submissions`
        )
        .then((res) => res.data),
    enabled: !!assignmentId,
  });
};

export const useGetAssignmentAnalytics = (assignmentId?: string) => {
  return useQuery({
    queryKey: assignmentKeys.analytics(assignmentId || ""),
    queryFn: () =>
      apiClient
        .get<{
          success: boolean;
          data: {
            questions: number;
            submissions: number;
            graded: number;
            pending: number;
            published: number;
            gradedRate: number;
          };
        }>(`/admin/assignments/${assignmentId}/analytics`)
        .then((res) => res.data),
    enabled: !!assignmentId,
  });
};

export const useGradeAssignmentSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      submissionId,
      data,
    }: {
      assignmentId: string;
      submissionId: string;
      data: {
        score?: number;
        maxScore?: number;
        feedback?: string;
      };
    }) =>
      apiClient
        .put<{ success: boolean; data: AssignmentSubmission }>(
          `/admin/assignments/submissions/${submissionId}/grade`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.submissions(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.analytics(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const usePublishAssignmentSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assignmentId,
      submissionId,
      data,
    }: {
      assignmentId: string;
      submissionId: string;
      data: {
        score?: number;
        maxScore?: number;
        feedback?: string;
      };
    }) =>
      apiClient
        .post<{ success: boolean; data: AssignmentSubmission }>(
          `/admin/assignments/submissions/${submissionId}/publish`,
          data
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.submissions(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.analytics(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.detail(variables.assignmentId),
      });
    },
  });
};

export const useGetStudentAssignment = (id?: string) => {
  return useQuery({
    queryKey: ["student", "assignment", id || ""],
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Assignment & { mySubmission?: AssignmentSubmission } }>(
          `/api/assignments/${id}`
        )
        .then((res) => res.data),
    enabled: !!id,
  });
};

export const useSubmitAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, unknown> }) =>
      apiClient
        .post<{ success: boolean; data: AssignmentSubmission }>(
          `/api/assignments/${id}/submit`,
          { answers }
        )
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["student", "assignment", variables.id],
      });
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

// ==========================================
// Student/Client API Hooks
// ==========================================

// Get all batches for students/clients (explore page)
export const useGetExploreBatches = (
  page = 1,
  limit = 10,
  filters?: {
    language?: string;
    categoryId?: string;
    level?: string;
    price?: "free" | "paid";
    minRating?: number;
    minRatingCount?: number;
  }
) => {
  return useQuery({
    queryKey: ["explore", "batches", page, limit, filters],
    queryFn: () =>
      apiClient
        .get("/api/batches", {
          params: { page, limit, ...(filters || {}) },
        })
        .then((res) => {
          const payload = res.data as {
            success?: boolean;
            data?: unknown;
            pagination?: unknown;
          };

          if (Array.isArray(payload?.data)) {
            return payload;
          }

          const nestedData =
            payload?.data && typeof payload.data === "object"
              ? (payload.data as {
                  batches?: unknown;
                  pagination?: unknown;
                })
              : undefined;

          return {
            ...payload,
            data: Array.isArray(nestedData?.batches) ? nestedData.batches : [],
            pagination: nestedData?.pagination ?? payload?.pagination,
          };
        }),
    enabled: true,
  });
};

// Get all purchased batches for student
export const useGetMyBatches = (page = 1, limit = 10) => {
  return useQuery({
    queryKey: ["myBatches", page, limit],
    queryFn: () =>
      apiClient
        .get("/api/batches/my-batches", {
          params: { page, limit },
        })
        .then((res) => res.data),
    enabled: tokenManager.isAuthenticated(),
  });
};

// Get single batch details for students/clients
export const useGetExploreBatch = (id: string) => {
  return useQuery({
    queryKey: ["explore", "batch", id],
    queryFn: () => apiClient.get(`/api/batches/${id}`).then((res) => res.data),
    enabled: !!id,
  });
};

export const useGetBatchCertificateStatus = (
  batchId: string,
  enabled = true
) => {
  return useQuery({
    queryKey: ["batch", "certificate", batchId],
    queryFn: () =>
      apiClient
        .get(`/api/batches/${batchId}/certificate`)
        .then((res) => res.data),
    enabled: !!batchId && enabled && tokenManager.isAuthenticated(),
  });
};

export const useClaimBatchCertificate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post(`/api/batches/${batchId}/certificate`)
        .then((res) => res.data),
    onSuccess: (_, batchId) => {
      queryClient.invalidateQueries({
        queryKey: ["batch", "certificate", batchId],
      });
      queryClient.invalidateQueries({
        queryKey: ["explore", "batch", batchId],
      });
    },
  });
};

export const useCreateBatchReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      rating,
      comment,
    }: {
      batchId: string;
      rating: number;
      comment?: string;
    }) =>
      apiClient
        .post(`/api/batches/${batchId}/reviews`, { rating, comment })
        .then((res) => res.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["explore", "batch", variables.batchId],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.batchReviews(variables.batchId),
      });
    },
  });
};

// Get all schedules for a purchased batch (STUDENT)
// @deprecated Use useGetClientSchedulesByBatch from schedules-client.ts instead
export const useGetBatchSchedules = (batchId: string) => {
  return useQuery({
    queryKey: ["batch", "schedules", batchId],
    queryFn: () =>
      apiClient.get(`/api/schedules/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

// Get all test series for students/clients (explore page)
export const useGetExploreTestSeries = () => {
  return useQuery({
    queryKey: ["explore", "testSeries"],
    queryFn: () => apiClient.get("/api/test-series").then((res) => res.data),
    enabled: true,
  });
};

// Get single test series details for students/clients
export const useGetExploreTestSeriesById = (id: string) => {
  return useQuery({
    queryKey: ["explore", "testSeries", id],
    queryFn: () =>
      apiClient.get(`/api/test-series/${id}`).then((res) => res.data),
    enabled: !!id,
  });
};

// Create batch checkout order for payment
export const useCreateBatchCheckout = () => {
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post(`/api/batches/${batchId}/checkout`)
        .then((res) => res.data),
  });
};

export const useVerifyBatchPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { orderId: string }) =>
        apiClient
          .post<
            ApiResponse<{
              verified: boolean;
              status?: string;
              message?: string;
              enrolledBatchIds?: string[];
            }>
          >(`/api/batches/verify-payment`, data)
        .then((res) => res.data),
    onSuccess: () => {
      // Invalidate my batches query to refetch purchased batches
      queryClient.invalidateQueries({ queryKey: ["myBatches"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batches"] });
    },
  });
};

// -- Konnect Batch Payment Hooks ---------------------------------------------

// Initiate Konnect checkout — backend calls Konnect init-payment and returns payUrl
export const useCreateBatchKonnectCheckout = () => {
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post<
          ApiResponse<{
            payUrl: string;
            paymentRef?: string;
            paymentLink?: string;
            orderId?: string;
            paymentId?: string;
          }>
        >(`/api/batches/${batchId}/konnect-checkout`)
        .then((res) => res.data),
  });
};

// Verify Konnect batch payment using the paymentRef in the redirect URL
export const useVerifyBatchKonnectPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { paymentRef: string }) =>
        apiClient
          .post<
            ApiResponse<{
              verified: boolean;
              status?: string;
              message?: string;
              enrolledBatchIds?: string[];
            }>
          >('/api/batches/konnect-verify', data)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBatches'] });
      queryClient.invalidateQueries({ queryKey: ['explore', 'batches'] });
    },
  });
};

// -- Subscription Payment Hooks -----------------------------------------------

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
      queryClient.invalidateQueries({ queryKey: ['myTestSeries'] });
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
export const useEnrollFreeBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient
        .post(`/api/batches/${batchId}/enroll-free`)
        .then((res) => res.data),
    onSuccess: (_, batchId) => {
      // Invalidate my batches query to refetch purchased batches
      queryClient.invalidateQueries({ queryKey: ["myBatches"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batches"] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batch", batchId] });
    },
  });
};

// ==========================================
// Client Subjects API Hooks (for purchased batches)
// ==========================================

// Get all subjects for a purchased batch (CLIENT)
export const useGetClientSubjectsByBatch = (batchId: string) => {
  return useQuery({
    queryKey: ["client", "subjects", "batch", batchId],
    queryFn: () =>
      apiClient.get(`/api/subjects/batch/${batchId}`).then((res) => res.data),
    enabled: !!batchId && tokenManager.isAuthenticated(),
  });
};

// Get subject by ID (CLIENT)
export const useGetClientSubject = (id: string) => {
  return useQuery({
    queryKey: ["client", "subjects", id],
    queryFn: () => apiClient.get(`/api/subjects/${id}`).then((res) => res.data),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

// ==========================================
// Client Chapters API Hooks (for purchased batches)
// ==========================================

// Get all chapters for a subject (CLIENT)
export const useGetClientChaptersBySubject = (subjectId: string) => {
  return useQuery({
    queryKey: ["client", "chapters", "subject", subjectId],
    queryFn: () =>
      apiClient
        .get(`/api/chapters/subject/${subjectId}`)
        .then((res) => res.data),
    enabled: !!subjectId && tokenManager.isAuthenticated(),
  });
};

// Get chapter by ID (CLIENT)
export const useGetClientChapter = (id: string) => {
  return useQuery({
    queryKey: ["client", "chapters", id],
    queryFn: () => apiClient.get(`/api/chapters/${id}`).then((res) => res.data),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

// ==========================================
// Client Topics API Hooks (for purchased batches)
// ==========================================

// Get all topics for a chapter (CLIENT)
export const useGetClientTopicsByChapter = (chapterId: string) => {
  return useQuery({
    queryKey: ["client", "topics", "chapter", chapterId],
    queryFn: () =>
      apiClient.get(`/api/topics/chapter/${chapterId}`).then((res) => res.data),
    enabled: !!chapterId && tokenManager.isAuthenticated(),
  });
};

// Get topic by ID (CLIENT)
export const useGetClientTopic = (id: string) => {
  return useQuery({
    queryKey: ["client", "topics", id],
    queryFn: () => apiClient.get(`/api/topics/${id}`).then((res) => res.data),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

// ==========================================
// Client Contents API Hooks (for purchased batches)
// ==========================================

// Get all contents for a topic (CLIENT)
export const useGetClientContentsByTopic = (topicId: string) => {
  return useQuery({
    queryKey: ["client", "contents", "topic", topicId],
    queryFn: () =>
      apiClient
        .get(`/api/contents/topic/${topicId}`)
        .then((res) => normalizeContentPayload(res.data)),
    enabled: !!topicId && tokenManager.isAuthenticated(),
  });
};

// Get content by ID (CLIENT)
export const useGetClientContent = (id: string) => {
  return useQuery({
    queryKey: ["client", "contents", id],
    queryFn: () =>
      apiClient
        .get(`/api/contents/${id}`)
        .then((res) => normalizeContentPayload(res.data)),
    enabled: !!id && tokenManager.isAuthenticated(),
  });
};

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


// ── AI Layer Hooks ────────────────────────────────────────────────────────────

import type {
  AiChatRequest,
  AiChatResponse,
  AiPlayground,
  WeakConceptFlag,
} from "@/lib/types/api";

/** Send a message to the AI tutor (non-streaming V1) */
export const useAiChat = () => {
  return useMutation({
    mutationFn: (payload: AiChatRequest) =>
      apiClient
        .post<AiChatResponse>("/api/ai/chat", payload, {
          timeout: 180000,
        })
        .then((res) => res.data),
  });
};

/** Teacher: generate or refine a playground widget */
export const useTeacherGeneratePlayground = () => {
  return useMutation({
    mutationFn: (payload: {
      prompt: string;
      concept: string;
      batchId: string;
      topicId?: string;
      contentId?: string;
      refineFromId?: string;
      refinementCount?: number;
    }) =>
      apiClient
        .post<ApiResponse<{ playground: AiPlayground & { html: string } }>>(
          "/api/ai/playground/generate",
          payload,
          { timeout: 180000 }
        )
        .then((res) => res.data),
  });
};

/** Teacher/Admin: list all playgrounds for a batch */
export const useGetBatchPlaygrounds = (batchId: string, enabled = true) => {
  return useQuery({
    queryKey: ["ai-playgrounds", batchId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<AiPlayground[]>>(
        `/api/ai/playgrounds/${batchId}`
      );
      return res.data?.data ?? [];
    },
    enabled: !!batchId && enabled,
  });
};

/** Teacher/Admin: load a saved playground with HTML preview */
export const useGetPlaygroundById = (id: string | null, enabled = true) => {
  return useQuery({
    queryKey: ["ai-playground", id],
    queryFn: async () => {
      const res = await apiClient.get<
        ApiResponse<{ playground: AiPlayground & { html: string } }>
      >(`/api/ai/playground/${id}`);
      return res.data?.data?.playground ?? null;
    },
    enabled: !!id && enabled,
  });
};

export const usePublishPlaygroundToTopic = () => {
  return useMutation({
    mutationFn: ({
      playgroundId,
      topicId,
      title,
      description,
    }: {
      playgroundId: string;
      topicId: string;
      title: string;
      description?: string;
    }) =>
      apiClient
        .post<ApiResponse<{ content: { id: string; topicId: string; title: string } }>>(
          `/api/ai/playground/${playgroundId}/publish`,
          { topicId, title, description }
        )
        .then((res) => res.data),
  });
};

/** Teacher/Admin: get weak concept analytics for a batch */
export const useGetWeakConcepts = (batchId: string) => {
  return useQuery({
    queryKey: ["weak-concepts", batchId],
    queryFn: () =>
      apiClient
        .get<ApiResponse<WeakConceptFlag[]>>(`/api/ai/weak-concepts/${batchId}`)
        .then((res) => res.data),
    enabled: !!batchId,
  });
};
