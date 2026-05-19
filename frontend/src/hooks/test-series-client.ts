import apiClient from "@/lib/api/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types aligned to client Test Series endpoints
export type ClientExamType =
  | "JEE"
  | "NEET"
  | "UPSC"
  | "BANK"
  | "SSC"
  | "GATE"
  | "CAT"
  | "NDA"
  | "CLAT"
  | "OTHER";

export type ClientCategory = {
  id: string;
  name: string;
  icon?: string | null;
  parentId?: string | null;
  parent?: ClientCategory | null;
};

export type ClientApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

export type ClientTestSeriesListItem = {
  id: string;
  exam?: ClientExamType | string | ClientCategory | null;
  category?: ClientCategory | null;
  title: string;
  slug: string;
  description?: { html?: string; features?: string[] };
  imageUrl?: string;
  totalPrice: number;
  discountPercentage: number;
  finalPrice: number;
  discountedPrice?: number; // Actual discounted price from API
  isFree: boolean;
  durationDays: number;
  testCount?: number; // Number of tests in series
  totalQuestions?: number; // Total questions in series
  isPurchased?: boolean; // Whether user has purchased
  isEnrolled: boolean;
  enrollmentDetails?: {
    enrolledAt?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  };
  enrollmentCount?: number; // Social proof
  averageScore?: number; // Engagement metric
  totalAttempts?: number; // Engagement metric
  faq?: {
    title: string;
    description: string;
  }[];
};

export type ClientTestInSeries = {
  id: string;
  testSeriesId?: string;
  organizationId?: string;
  title: string;
  slug: string;
  description?: {
    html?: string;
    topics?: string[];
  };
  instructions?: {
    html?: string;
  } | null;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  isFree: boolean;
  isPublished?: boolean;
  showAnswersAfterSubmit?: boolean;
  allowReview?: boolean;
  shuffleQuestions?: boolean;
  sectionCount?: number;
  questionCount?: number;
  attemptCount?: number;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  hasAttempted?: boolean;
  attemptStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
};

export type ClientCheckoutResponse = {
  orderId: string;
  paymentId: string;
  paymentLink: string;
  amount: number;
  currency: string;
};

// Query Keys
const clientTsKeys = {
  root: ["client", "test-series"] as const,
  list: (filters: Record<string, unknown>) =>
    [...clientTsKeys.root, "list", filters] as const,
  myEnrollments: (page: number, limit: number) =>
    [...clientTsKeys.root, "my-enrollments", { page, limit }] as const,
  detail: (identifier: string) =>
    [...clientTsKeys.root, "detail", identifier] as const,
  tests: (seriesId: string) =>
    [...clientTsKeys.root, "tests", seriesId] as const,
  stats: (seriesId: string) =>
    [...clientTsKeys.root, "stats", seriesId] as const,
};

// Hooks
export const useClientTestSeriesList = (params?: {
  page?: number;
  limit?: number;
  exam?: ClientExamType;
}) => {
  return useQuery({
    queryKey: clientTsKeys.list(params ?? {}),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", String(params.page));
      if (params?.limit) queryParams.append("limit", String(params.limit));
      if (params?.exam) queryParams.append("exam", params.exam);

      const { data } = await apiClient.get<
        ClientApiResponse<ClientTestSeriesListItem[]>
      >(
        `/api/test-series${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`
      );
      return data;
    },
  });
};

export const useClientMyEnrollments = (
  params?: {
    page?: number;
    limit?: number;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: clientTsKeys.myEnrollments(
      params?.page ?? 1,
      params?.limit ?? 10
    ),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", String(params.page));
      if (params?.limit) queryParams.append("limit", String(params.limit));

      const { data } = await apiClient.get<
        ClientApiResponse<ClientTestSeriesListItem[]>
      >(
        `/api/test-series/my-test-series${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`
      );
      return data;
    },
    enabled: options?.enabled ?? true,
  });
};

export const useClientTestSeriesDetail = (identifier?: string) => {
  return useQuery({
    queryKey: clientTsKeys.detail(identifier ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<
        ClientApiResponse<ClientTestSeriesListItem>
      >(`/api/test-series/${identifier}`);
      return data;
    },
    enabled: Boolean(identifier),
  });
};

export const useClientTestsInSeries = (seriesId?: string) => {
  return useQuery({
    queryKey: clientTsKeys.tests(seriesId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<
        ClientApiResponse<ClientTestInSeries[]>
      >(`/api/test-series/${seriesId}/tests`);
      return data;
    },
    enabled: Boolean(seriesId),
  });
};

export const useClientCheckoutTestSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (testSeriesId: string) => {
      const { data } = await apiClient.post<
        ClientApiResponse<ClientCheckoutResponse>
      >(`/api/test-series/${testSeriesId}/checkout`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientTsKeys.root });
    },
  });
};

export const useClientEnrollFreeTestSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (testSeriesId: string) => {
      const { data } = await apiClient.post<
        ClientApiResponse<{ enrolled: boolean }>
      >(`/api/test-series/${testSeriesId}/enroll-free`);
      return data;
    },
    onSuccess: (_res, testSeriesId) => {
      qc.invalidateQueries({ queryKey: clientTsKeys.root });
      qc.invalidateQueries({ queryKey: clientTsKeys.detail(testSeriesId) });
    },
  });
};

export const useClientVerifyPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { orderId: string }) => {
      const { data } = await apiClient.post<
        ClientApiResponse<{
          verified: boolean;
          status?: string;
          message?: string;
        }>
      >("/api/test-series/verify-payment", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientTsKeys.root });
    },
  });
};

// ── Konnect Test Series Payment Hooks ────────────────────────────────────────

// Initiate Konnect checkout for a test series
export const useClientCheckoutTestSeriesKonnect = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (testSeriesId: string) => {
      const { data } = await apiClient.post<
        ClientApiResponse<{
          payUrl: string;
          paymentRef?: string;
          paymentLink?: string;
          orderId?: string;
          paymentId?: string;
        }>
      >(`/api/test-series/${testSeriesId}/konnect-checkout`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientTsKeys.root });
    },
  });
};

// Verify Konnect test series payment using the paymentRef in the redirect URL
export const useClientVerifyKonnectPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { paymentRef: string }) => {
      const { data } = await apiClient.post<
        ClientApiResponse<{
          verified: boolean;
          status?: string;
          message?: string;
        }>
      >("/api/test-series/konnect-verify", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: clientTsKeys.root });
    },
  });
};

export const clientTestSeriesKeys = clientTsKeys;
