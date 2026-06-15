import axios, { AxiosInstance } from "axios";
import { tokenManager } from "@/lib/api/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export const platformClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

platformClient.interceptors.request.use((config) => {
  const token = tokenManager.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
  totalCourses: number;
  totalEnrollments: number;
  newOrgsThisMonth: number;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  userCount: number;
  createdAt: string;
  maintenanceMode?: boolean;
}

export interface PlatformOrganizationDetail extends PlatformOrganization {
  subdomain: string;
  domain: string | null;
  batchCount: number;
  subscriptionPrice: number;
  subscriptionType: string;
  maintenanceMode: boolean;
}

export interface PlatformReport {
  id: string;
  organizationId: string;
  batchId: string | null;
  contentId: string | null;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export const platformApi = {
  login: (data: { email: string; password: string }) =>
    platformClient.post<{ success: boolean; data: { token: string } }>(
      "/platform/auth/login",
      data
    ),

  getStats: () =>
    platformClient.get<{ success: boolean; data: PlatformStats }>(
      "/platform/stats"
    ),

  listOrganizations: () =>
    platformClient.get<{ success: boolean; data: PlatformOrganization[] }>(
      "/platform/organizations"
    ),

  getOrganization: (id: string) =>
    platformClient.get<{ success: boolean; data: PlatformOrganizationDetail }>(
      `/platform/organizations/${id}`
    ),

  updateOrganizationStatus: (id: string, isActive: boolean) =>
    platformClient.patch(`/platform/organizations/${id}/status`, { isActive }),

  updateOrganizationPlan: (
    id: string,
    data: { plan: string; subscriptionPrice?: number; subscriptionType?: string }
  ) => platformClient.patch(`/platform/organizations/${id}/plan`, data),

  toggleMaintenanceMode: (id: string, maintenanceMode: boolean) =>
    platformClient.patch(`/platform/organizations/${id}/maintenance`, {
      maintenanceMode,
    }),

  deleteOrganization: (id: string) =>
    platformClient.delete(`/platform/organizations/${id}`),

  listReports: (status?: string) =>
    platformClient.get<{ success: boolean; data: PlatformReport[] }>(
      "/platform/reports",
      { params: status ? { status } : undefined }
    ),

  resolveReport: (id: string, status: string) =>
    platformClient.patch(`/platform/reports/${id}/resolve`, { status }),
};
