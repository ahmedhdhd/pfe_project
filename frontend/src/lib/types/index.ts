export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  tenantId: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: "free" | "pro" | "enterprise";
  isActive: boolean;
  createdAt: Date;
  settings: TenantSettings;
}

export interface TenantSettings {
  theme: "light" | "dark" | "system";
  allowSelfRegistration: boolean;
  maxUsers: number;
  features: string[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructorId: string;
  instructorName: string;
  tenantId: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  lessons: Lesson[];
  enrolledStudents: number;
  progress?: number; // For student view
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  duration: number; // in minutes
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  completed?: boolean; // For student view
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;
  progress: number;
  lastAccessedAt: Date;
  completedAt?: Date;
}

export interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  activeEnrollments: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: "enrollment" | "completion" | "course_created" | "user_registered";
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface NavigationItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  children?: NavigationItem[];
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
