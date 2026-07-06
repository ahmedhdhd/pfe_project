import axios, { AxiosInstance, AxiosResponse } from "axios";
import { getCookie, setCookie, deleteCookie } from "cookies-next";
import {
  ApiResponse,
  LoginResponse,
  RegisterResponse,
  VerifyEmailResponse,
  SetPasswordResponse,
  InviteUserResponse,
  Organization,
  CreateOrganizationData,
  CreateCourseData,
  OrganizationConfigResponse,
  CreateOrganizationConfigData,
  CreateOrganizationConfigResponse,
  GeneratedOrganizationTheme,
  Order,
  OrderHistoryResponse,
  RecentlyWatchedResponse,
  TrackProgressRequest,
  TrackProgressResponse,
  ContentProgressResponse,
  WatchStatsResponse,
  BatchProgressResponse,
  MarkCompleteResponse,
} from "@/lib/types/api";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Token management
const QUEZT_AUTH_KEY = "QUEZT_AUTH";

export interface User {
  id: string;
  organizationId: string;
  organizationName?: string;
  organizationSlug?: string;
  email: string;
  username: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "SUPER_ADMIN";
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

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (error?: unknown) => void;
}> = [];

const isStudentRole = (role?: string | null) => role === "STUDENT";

const refreshAuthToken = (refreshToken: string) => {
  const role = tokenManager.getUser()?.role;
  return isStudentRole(role)
    ? api.refreshToken({ refreshToken })
    : api.adminRefreshToken({ refreshToken });
};

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const isTransientRefreshFailure = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (error.code === "ECONNABORTED") {
    return true;
  }

  if (!error.response) {
    return true;
  }

  return error.response.status >= 500;
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
      url?: string;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";
    const isAuthPage =
      currentPath.includes("/login") ||
      currentPath.includes("/register") ||
      currentPath.includes("/set-password") ||
      currentPath.includes("/verify-email");

    const requestUrl = originalRequest?.url ?? "";
    const isRefreshCall =
      requestUrl.includes("/admin/auth/refresh") ||
      requestUrl.includes("/api/auth/refresh-token");

    if (isRefreshCall) {
      return Promise.reject(error);
    }

    if (isAuthPage) {
      return Promise.reject(error);
    }

    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      tokenManager.clearAuthData();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token as string}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    return new Promise((resolve, reject) => {
      refreshAuthToken(refreshToken)
        .then((response) => {
          if (response.data.success && response.data.data) {
            const authData = tokenManager.getAuthData();
            const newAccess = response.data.data.accessToken;
            const newRefresh =
              response.data.data.refreshToken || authData?.refreshToken;
            if (authData && authData.user) {
              tokenManager.setAuthData(newAccess, authData.user, newRefresh);
            }
            originalRequest.headers.Authorization = `Bearer ${newAccess}`;
            processQueue(null, newAccess);
            resolve(apiClient(originalRequest));
          } else {
            processQueue(new Error("Token refresh failed"), null);
            reject(error);
          }
        })
        .catch((refreshError) => {
          processQueue(refreshError, null);
          if (!isTransientRefreshFailure(refreshError)) {
            tokenManager.clearAuthData();
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
          }
          reject(refreshError);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
);

// Token management functions
export const tokenManager = {
  setAuthData: (
    token: string,
    user: {
      id: string;
      email?: string;
      username: string;
      role: string;
      organizationId: string;
      organizationName?: string;
      organizationSlug?: string;
      phoneNumber?: string;
      countryCode?: string;
    },
    refreshToken?: string
  ) => {
    const authData = {
      token,
      refreshToken,
      user,
      timestamp: Date.now(),
    };

    setCookie(QUEZT_AUTH_KEY, JSON.stringify(authData), {
      maxAge: 7 * 24 * 60 * 60, // 7 days (matches JWT expiry)
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  },

  getRefreshToken: () => {
    const authData = getCookie(QUEZT_AUTH_KEY);
    if (authData && typeof authData === "string") {
      try {
        const parsed = JSON.parse(authData);
        return parsed.refreshToken || null;
      } catch {
        return null;
      }
    }
    return null;
  },

  getToken: () => {
    const authData = getCookie(QUEZT_AUTH_KEY);
    if (authData && typeof authData === "string") {
      try {
        const parsed = JSON.parse(authData);
        return parsed.token;
      } catch {
        return null;
      }
    }
    return null;
  },

  getUser: () => {
    // Only get user data on client side
    if (typeof window === "undefined") {
      console.log("TokenManager: Server side - returning null");
      return null;
    }

    const authData = getCookie(QUEZT_AUTH_KEY);
    console.log("TokenManager: Getting user data");
    console.log("TokenManager: Auth data:", authData);
    console.log("TokenManager: Auth data type:", typeof authData);

    if (authData && typeof authData === "string") {
      try {
        const parsed = JSON.parse(authData);
        console.log("TokenManager: Parsed data:", parsed);
        console.log("TokenManager: User from parsed data:", parsed.user);
        return parsed.user;
      } catch (error) {
        console.error("TokenManager: Error parsing auth data:", error);
        return null;
      }
    }
    console.log("TokenManager: No valid auth data found");
    return null;
  },

  getAuthData: () => {
    const authData = getCookie(QUEZT_AUTH_KEY);
    if (authData && typeof authData === "string") {
      try {
        return JSON.parse(authData);
      } catch {
        return null;
      }
    }
    return null;
  },

  clearAuthData: () => {
    deleteCookie(QUEZT_AUTH_KEY);
  },

  isAuthenticated: () => {
    // Only check cookies on client side
    if (typeof window === "undefined") {
      console.log("TokenManager: Server side - returning false");
      return false;
    }

    const cookie = getCookie(QUEZT_AUTH_KEY);
    console.log("TokenManager: Checking authentication");
    console.log("TokenManager: Cookie value:", cookie);
    console.log("TokenManager: Cookie exists:", !!cookie);
    return !!cookie;
  },
};

// API endpoints
export const api = {
  // Organizations
  createOrganization: (data: CreateOrganizationData) =>
    apiClient.post<ApiResponse<Organization>>("/admin/organizations", data),

  // Auth - Admin endpoints
  register: (data: {
    organizationId: string;
    email: string;
    username: string;
  }) =>
    apiClient.post<ApiResponse<RegisterResponse>>("/admin/auth/register", data),

  verifyEmail: (data: { token: string }) =>
    apiClient.post<ApiResponse<VerifyEmailResponse>>(
      "/admin/auth/verify-email",
      data
    ),

  setPassword: (data: { userId: string; password: string }) =>
    apiClient.post<ApiResponse<SetPasswordResponse>>(
      "/admin/auth/set-password",
      data
    ),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiResponse<LoginResponse>>("/admin/auth/login", data),

  adminForgotPassword: (data: { email: string; organizationId?: string }) =>
    apiClient.post<ApiResponse<{ message: string }>>(
      "/admin/auth/forgot-password",
      data
    ),

  adminResetPassword: (data: { token: string; password: string }) =>
    apiClient.post<ApiResponse<{ message: string }>>(
      "/admin/auth/reset-password",
      data
    ),

  resendVerification: (data: { email: string }) =>
    apiClient.post<ApiResponse<{ message: string }>>(
      "/admin/auth/resend-verification",
      data
    ),

  // Auth - Student endpoints
  studentRegister: (data: {
    organizationId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) =>
    apiClient.post<ApiResponse<RegisterResponse>>("/api/auth/register", data),

  studentVerifyEmail: (data: { token: string }) =>
    apiClient.post<ApiResponse<VerifyEmailResponse>>(
      "/api/auth/verify-email",
      data
    ),

  studentSetPassword: (data: { userId: string; password: string }) =>
    apiClient.post<ApiResponse<SetPasswordResponse>>(
      "/api/auth/set-password",
      data
    ),

  studentLogin: (data: { email: string; password: string; organizationId: string }) =>
    apiClient.post<ApiResponse<LoginResponse>>("/api/auth/login", data),

  studentResendVerification: (data: { email: string; organizationId: string }) =>
    apiClient.post<ApiResponse<{ message: string }>>(
      "/api/auth/resend-verification",
      data
    ),

  studentForgotPassword: (data: { email: string; organizationId: string }) =>
    apiClient.post<ApiResponse<{ message: string }>>(
      "/api/auth/forgot-password",
      data
    ),

  studentResetPassword: (data: { token: string; password: string }) =>
    apiClient.post<ApiResponse<{ message: string }>>(
      "/api/auth/reset-password",
      data
    ),

  // OTP Auth - Client endpoints
  getOtp: (data: {
    countryCode: string;
    phoneNumber: string;
    organizationId: string;
  }) =>
    apiClient.post<ApiResponse<{ isExistingUser: boolean }>>(
      "/api/auth/get-otp",
      data
    ),

  verifyOtp: (data: {
    countryCode: string;
    phoneNumber: string;
    otp: string;
    organizationId: string;
  }) =>
    apiClient.post<
      ApiResponse<{
        accessToken: string;
        refreshToken: string;
        user: {
          id: string;
          phoneNumber: string;
          countryCode: string;
          username: string;
          role: "STUDENT";
          organizationId: string;
          isVerified: boolean;
        };
      }>
    >("/api/auth/verify-otp", data),

  refreshToken: (data: { refreshToken: string }) =>
    apiClient.post<
      ApiResponse<{
        accessToken: string;
        refreshToken: string;
        user: unknown;
      }>
    >("/api/auth/refresh-token", data),

  inviteUser: (data: {
    email: string;
    username: string;
    role?: "ADMIN" | "TEACHER";
  }) =>
    apiClient.post<ApiResponse<InviteUserResponse>>(
      "/admin/auth/invite-user",
      data
    ),

  adminRefreshToken: (data: { refreshToken: string }) =>
    apiClient.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      "/admin/auth/refresh",
      data
    ),

  // Course endpoints
  getCourses: (page: number = 1, limit: number = 10) =>
    apiClient.get<ApiResponse<unknown>>(
      `/admin/courses?page=${page}&limit=${limit}`
    ),

  createCourse: (data: CreateCourseData) =>
    apiClient.post<ApiResponse<unknown>>("/admin/courses", data),

  // Organization Configuration (Public endpoint)
  getOrganizationConfig: (slug: string) =>
    apiClient.get<OrganizationConfigResponse>(
      `/api/organization-config/${slug}`
    ),

  // Organization Configuration (Admin endpoint)
  createOrganizationConfig: (data: CreateOrganizationConfigData) =>
    apiClient.post<CreateOrganizationConfigResponse>(
      "/admin/organization-config/config",
      data
    ),

  updateOrganizationConfig: (data: CreateOrganizationConfigData) =>
    apiClient.put<CreateOrganizationConfigResponse>(
      "/admin/organization-config/config",
      data
    ),

  getOrganizationConfigAdmin: () =>
    apiClient.get<OrganizationConfigResponse>("/admin/organization-config/config"),

  generateOrganizationTheme: (data: {
    description: string;
    currentCustomCss?: string;
  }) =>
    apiClient.post<ApiResponse<GeneratedOrganizationTheme>>(
      "/admin/organization-config/config/theme/generate",
      data,
      { timeout: 180000 }
    ),

  // Profile endpoints (Client/Student)
  getProfile: () => apiClient.get<ApiResponse<User>>("/api/profile"),
  updateProfile: (data: {
    username?: string;
    profileImg?: string;
    gender?: "Male" | "Female" | "Other";
    phoneNumber?: string;
    address?: {
      city?: string;
      state?: string;
      pincode?: string;
    };
  }) => apiClient.put<ApiResponse<User>>("/api/profile", data),

  // Upload endpoints (Client/Student)
  generateSignedUrl: (data: {
    fileName: string;
    fileType: string;
    fileSize: number;
    folder: string;
  }) =>
    apiClient.post<
      ApiResponse<{
        signedUrl: string;
        key: string;
        bucket: string;
      }>
    >("/api/upload/signed-url", data),
  directUpload: (formData: FormData) =>
    apiClient.post<
      ApiResponse<{
        key: string;
        url: string;
        bucket: string;
        originalName: string;
        size: number;
        mimeType: string;
      }>
    >("/api/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  // Order endpoints (Client/Student)
  getOrderHistory: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) =>
      apiClient.get<OrderHistoryResponse>("/api/orders/history", {
        params,
      }),
  getOrderById: (id: string) =>
    apiClient.get<ApiResponse<Order>>(`/api/orders/${id}`),
  createCourseOrderCheckout: (data: {
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
  }) =>
    apiClient.post<
      ApiResponse<{
        orderId: string;
        redirectUrl?: string;
        payUrl?: string;
        paymentLink?: string;
        paymentRef?: string;
        paymentId?: string;
        order?: Order;
      }>
    >("/api/orders/checkout", data),
  uploadOrderProof: (id: string, data: { proofImageUrl: string }) =>
    apiClient.post<ApiResponse<Order>>(`/api/orders/${id}/proof`, data),
  getAdminOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) =>
    apiClient.get<OrderHistoryResponse>("/admin/orders", { params }),
  getAdminOrderById: (id: string) =>
    apiClient.get<ApiResponse<Order>>(`/admin/orders/${id}`),
  approveAdminOrder: (id: string, data?: { note?: string }) =>
    apiClient.post<ApiResponse<Order>>(`/admin/orders/${id}/approve`, data),
  rejectAdminOrder: (id: string, data?: { note?: string }) =>
    apiClient.post<ApiResponse<Order>>(`/admin/orders/${id}/reject`, data),

    // Content Progress endpoints (Client/Student)
  getRecentlyWatched: (params?: {
    page?: number;
    limit?: number;
    batchId?: string;
    completedOnly?: boolean;
  }) =>
    apiClient.get<RecentlyWatchedResponse>("/api/content/recently-watched", {
      params,
    }),

  trackContentProgress: (contentId: string, data: TrackProgressRequest) =>
    apiClient.post<TrackProgressResponse>(
      `/api/content/${contentId}/progress`,
      data
    ),

  getContentProgress: (contentId: string) =>
    apiClient.get<ContentProgressResponse>(
      `/api/content/${contentId}/progress`
    ),

  getWatchStats: (params?: { batchId?: string }) =>
    apiClient.get<WatchStatsResponse>("/api/content/watch-stats", {
      params,
    }),

  markContentComplete: (contentId: string) =>
    apiClient.post<MarkCompleteResponse>(`/api/content/${contentId}/complete`),

  getBatchProgress: (batchId: string) =>
    apiClient.get<BatchProgressResponse>("/api/content/batch-progress", {
      params: { batchId },
    }),
};

export default apiClient;
