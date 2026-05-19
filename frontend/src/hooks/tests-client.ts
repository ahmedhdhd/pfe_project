import apiClient from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";

export type TestsClientApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type PublishedTestDetails = {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  isFree: boolean;
  instructions?: {
    html?: string;
    topics?: string[];
  };
  // preview-only fields (no answers)
  sections?: Array<{
    id: string;
    name: string;
    displayOrder: number;
    questionCount: number;
  }>;
};

export type TestPreview = {
  id: string;
  title: string;
  durationMinutes: number;
  sections: Array<{
    id: string;
    name: string;
    displayOrder: number;
    questions: Array<{
      id: string;
      text: string;
      imageUrl?: string;
      type: string;
      marks?: number;
      negativeMarks?: number;
      options?: Array<{ id: string; text: string }>;
    }>;
  }>;
};

const testsClientKeys = {
  root: ["client", "tests"] as const,
  publishedDetail: (identifier: string) =>
    [...testsClientKeys.root, identifier] as const,
  preview: (testId: string) =>
    [...testsClientKeys.root, testId, "preview"] as const,
};

// GET /api/tests/{identifier}
export const useClientPublishedTestDetails = (identifier?: string) => {
  return useQuery({
    queryKey: testsClientKeys.publishedDetail(identifier ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<
        TestsClientApiResponse<PublishedTestDetails>
      >(`/api/tests/${identifier}`);
      return data;
    },
    enabled: Boolean(identifier),
  });
};

// GET /api/tests/{testId}/preview
export const useClientTestPreview = (testId?: string) => {
  return useQuery({
    queryKey: testsClientKeys.preview(testId ?? ""),
    queryFn: async () => {
      const { data } = await apiClient.get<TestsClientApiResponse<TestPreview>>(
        `/api/tests/${testId}/preview`
      );
      return data;
    },
    enabled: Boolean(testId),
  });
};

export const testsClientQueryKeys = testsClientKeys;
