"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, tokenManager } from "@/lib/api/client";
import { ApiResponse, LoginResponse } from "@/lib/types/api";
import { queryKeys } from "./query-keys";

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

        // Redirect based on user role
        const userRole = data.data.user.role?.toUpperCase();
        if (userRole === 'SUPER_ADMIN') {
          router.push('/platform/dashboard');
        } else {
          // Admins and teachers share the admin dashboard
          router.push('/admin/dashboard');
        }
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

export const useAdminForgotPassword = () => {
  return useMutation({
    mutationFn: (data: { email: string; organizationId?: string }) =>
      api.adminForgotPassword(data).then((res) => res.data),
    onError: (error) => {
      console.error("Admin forgot password failed:", error);
    },
  });
};

export const useAdminResetPassword = () => {
  return useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      api.adminResetPassword(data).then((res) => res.data),
    onError: (error) => {
      console.error("Admin reset password failed:", error);
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
    mutationFn: (data: {
      email: string;
      username: string;
      role?: "ADMIN" | "TEACHER";
    }) => api.inviteUser(data).then((res) => res.data),
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

