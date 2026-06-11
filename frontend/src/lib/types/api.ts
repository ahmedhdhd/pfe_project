/**
 * API response types for consistent type safety
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
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

// Auth API Types
export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  /** Server always returns this on email/password login; required for silent refresh on 401. */
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    organizationId: string;
    organizationName?: string;
    organizationSlug?: string;
  };
}

export interface RegisterData {
  organizationId: string;
  email: string;
  username: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  username: string;
  message: string;
}

export interface VerifyEmailData {
  token: string;
}

export interface VerifyEmailResponse {
  message: string;
  userId: string;
}

export interface SetPasswordData {
  userId: string;
  password: string;
}

export interface SetPasswordResponse {
  message: string;
}

export interface ResendVerificationData {
  email: string;
}

export interface InviteUserData {
  email: string;
  username: string;
}

export interface InviteUserResponse {
  id: string;
  email: string;
  username: string;
  role: "TEACHER";
  organizationId: string;
  message: string;
}

// Organization API Types
export interface CreateOrganizationData {
  name: string;
  slug: string;
  subdomain?: string;
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    logo?: File | null;
    customDomain?: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  subdomain: string;
  createdAt: string;
}

// Course API Types
export interface CreateCourseData {
  title: string;
  description: string;
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
  createdAt: string;
  updatedAt: string;
  enrolledStudents: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  videoUrl?: string;
  duration: number;
  order: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// User API Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  avatar?: string;
  tenantId: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  tenantId: string;
}

// Dashboard API Types
export interface DashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  activeEnrollments: number;
  recentActivity: Activity[];
}

export interface Activity {
  id: string;
  type: "enrollment" | "course_created" | "completion" | "login";
  description: string;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: Date;
  progress: number;
  lastAccessedAt: Date;
}

// Organization Configuration API Types
export interface OrganizationConfigTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}

export interface OrganizationConfigFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface OrganizationConfigTestimonial {
  name: string;
  message: string;
  avatar?: string;
}

export interface OrganizationConfigFAQ {
  question: string;
  answer: string;
}

export interface OrganizationConfigSMTP {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface OrganizationConfig {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  domain?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** @deprecated use konnectApiKey */
  razorpayKeyId?: string;
  /** @deprecated use konnectWalletId */
  razorpayKeySecret?: string;
  konnectApiKey?: string;
  konnectWalletId?: string;
  paymentGateway?: 'konnect' | 'flouci';
  openRouterApiKey?: string;
  paymentMode?: 'free' | 'per_course' | 'subscription';
  subscriptionPrice?: number;
  subscriptionType?: 'onetime' | 'monthly';
  currency?: string;
  taxPercentage?: string;
  invoicePrefix?: string;
  logoUrl?: string;
  faviconUrl?: string;
  bannerUrls?: string[];
  motto?: string;
  description?: string;
  theme?: OrganizationConfigTheme;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  features?: OrganizationConfigFeature[];
  testimonials?: OrganizationConfigTestimonial[];
  faq?: OrganizationConfigFAQ[];
  socialLinks?: Record<string, string>;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  smtpConfig?: OrganizationConfigSMTP;
  supportEmail?: string;
  featuresEnabled?: Record<string, boolean>;
  maintenanceMode?: boolean;
  customCSS?: string;
  customJS?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrganizationConfigResponse {
  success: boolean;
  data: OrganizationConfig;
}

export interface CreateOrganizationConfigData {
  organizationId: string;
  name: string;
  slug: string;
  domain?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** @deprecated use konnectApiKey */
  razorpayKeyId?: string;
  /** @deprecated use konnectWalletId */
  razorpayKeySecret?: string;
  konnectApiKey?: string;
  konnectWalletId?: string;
  paymentGateway?: 'konnect' | 'flouci';
  openRouterApiKey?: string;
  paymentMode?: 'free' | 'per_course' | 'subscription';
  subscriptionPrice?: number;
  subscriptionType?: 'onetime' | 'monthly';
  currency?: string;
  taxPercentage?: string;
  invoicePrefix?: string;
  logoUrl?: string;
  faviconUrl?: string;
  bannerUrls?: string[];
  motto?: string;
  description?: string;
  theme?: OrganizationConfigTheme;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
  ctaUrl?: string;
  features?: OrganizationConfigFeature[];
  testimonials?: OrganizationConfigTestimonial[];
  faq?: OrganizationConfigFAQ[];
  socialLinks?: Record<string, string>;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  smtpConfig?: OrganizationConfigSMTP;
  supportEmail?: string;
  featuresEnabled?: Record<string, boolean>;
  maintenanceMode?: boolean;
  customCSS?: string;
  customJS?: string;
}

export interface CreateOrganizationConfigResponse {
  success: boolean;
  data: OrganizationConfig;
  message?: string;
}

export interface GeneratedOrganizationTheme {
  themeName: string;
  summary: string;
  theme: OrganizationConfigTheme;
  customCss: string;
  approvedCustomCss: string;
}

export interface BatchReviewUser {
  id: string;
  username: string;
  profileImg?: string | null;
}

export interface BatchReview {
  id: string;
  batchId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: BatchReviewUser;
}

export interface BatchReviewsResponse {
  success: boolean;
  data: {
    reviews: BatchReview[];
    averageRating: number;
    ratingCount: number;
    reviewCount: number;
  };
  message?: string;
}

// Order API Types
export type PaymentStatus =
  | "SUCCESS"
  | "FAILED"
  | "PENDING"
  | "PROCESSING"
  | "REFUNDED";

export type EntityType = "BATCH" | "BATCH_CART" | "TEST_SERIES";
export type ManualOrderStatus =
  | "NOT_REQUIRED"
  | "AWAITING_PROOF"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface OrderItemSnapshot {
  batchId: string;
  title: string;
  imageUrl?: string | null;
  originalPrice: number;
  finalPrice: number;
  discountPercentage: number;
  category?: string | null;
  language?: string | null;
}

export interface OrderBillingInfo {
  firstName: string;
  lastName: string;
  enterprise?: string;
  taxNumber?: string;
  region: string;
  phone: string;
  email: string;
}

export interface Order {
  id: string;
  entityType: EntityType;
  entityId: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  paymentStatus: PaymentStatus;
  providerOrderId: string;
  providerPaymentId: string;
  receiptId: string;
  failureReason?: string;
  refundId?: string;
  refundAmount?: number;
  refundedAt?: string;
  initiatedAt: string;
  completedAt?: string;
  failedAt?: string;
  createdAt: string;
  updatedAt?: string;
  entityDetails?: Record<string, unknown>;
  items?: OrderItemSnapshot[];
  itemCount?: number;
  billingInfo?: OrderBillingInfo;
  manualReviewStatus?: ManualOrderStatus;
  proofImageUrl?: string | null;
  proofUploadedAt?: string | null;
  adminReviewNote?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  user?: {
    id: string;
    username: string;
    email?: string | null;
  };
}

export interface OrderHistoryResponse {
  success: boolean;
  data: Order[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message?: string;
}

// Content Progress API Types
export interface ContentProgress {
  watchedSeconds: number;
  totalDuration: number;
  watchPercentage: number;
  isCompleted: boolean;
  completedAt?: string;
  watchCount?: number;
  lastWatchedAt?: string;
}

export interface RecentlyWatchedVideo {
  content: Record<string, unknown>;
  progress: ContentProgress;
}

export interface WatchStats {
  totalVideosWatched: number;
  completedVideosCount: number;
  totalWatchTimeSeconds: number;
  totalWatchTimeFormatted: string;
  averageCompletionRate: number;
}

export interface RecentlyWatchedResponse {
  success: boolean;
  data: {
    videos: RecentlyWatchedVideo[];
    stats: WatchStats;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface TrackProgressRequest {
  watchedSeconds: number;
  totalDuration: number;
}

export interface TrackProgressResponse {
  success: boolean;
  data: Record<string, unknown>;
}

export interface ContentProgressResponse {
  success: boolean;
  data: ContentProgress;
}

export interface WatchStatsResponse {
  success: boolean;
  data: WatchStats;
}

export interface BatchProgress {
  totalVideos: number;
  completedVideos: number;
  progressPercentage: number;
  totalWatchTimeSeconds: number;
}

export interface BatchProgressResponse {
  success: boolean;
  data: BatchProgress;
}

export interface MarkCompleteResponse {
  success: boolean;
  data?: Record<string, unknown>;
}

// Test Attempt Dashboard API Types
export interface TestSeriesInfo {
  id: string;
  title: string;
  exam: string;
}

export interface TestInfo {
  id: string;
  title: string;
  slug: string;
  totalMarks: number;
  duration: number;
  passingMarks: number;
  testSeries?: TestSeriesInfo;
}

export interface RecentCompletedAttempt {
  id: string;
  attemptNumber: number;
  userId: string;
  testId: string;
  test: TestInfo;
  totalScore: number;
  percentage: number;
  rank: number | null;
  percentile: number | null;
  isPassed: boolean;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  timeSpentSeconds: number;
  submittedAt: string;
  startedAt: string;
  isCompleted: boolean;
}

export interface TestAttemptStats {
  totalTestsAttempted: number;
  totalTestsCompleted: number;
  totalTestsPassed: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  totalTimeSpentSeconds: number;
  totalTimeSpentHours: number;
  bestScore: number;
  bestPercentage: number;
  recentTrend: "improving" | "stable" | "declining";
}

export interface RecentCompletedTestsResponse {
  success: boolean;
  data: RecentCompletedAttempt[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats: TestAttemptStats;
  message?: string;
}

export interface TestAttemptStatsResponse {
  success: boolean;
  data: TestAttemptStats;
  message?: string;
}

// ── AI Layer Types ─────────────────────────────────────────────────────────

export type AiMessageType = 'text' | 'playground' | 'mixed';

export interface AiPlaygroundEmbed {
  id: string;
  html: string;
  concept: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: AiMessageType;
  content?: string;           // markdown text
  playground?: AiPlaygroundEmbed;
  timestamp: Date;
}

export interface AiChatContext {
  batchId: string;
  chapterId: string;
  topicId: string;
  contentId: string;
}

export interface AiChatRequest {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: AiChatContext;
}

export interface AiChatResponse {
  success: boolean;
  message?: string;
  data: {
    reply: {
      type: AiMessageType;
      text?: string;
      playground?: AiPlaygroundEmbed;
    };
  };
}

export interface AiPlayground {
  id: string;
  title: string;
  concept: string;
  createdByRole: 'TEACHER' | 'STUDENT';
  refinements: number;
  createdAt: string;
  topicId?: string;
  contentId?: string;
  html?: string;
}

export interface WeakConceptFlag {
  concept: string;
  suggestedReviewTopic: string;
  studentCount: number;
}
