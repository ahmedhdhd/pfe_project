// Shared types for course components
export interface BatchReview {
  id: string;
  batchId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    profileImg?: string | null;
  };
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  class: string;
  exam: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
    parent?: {
      id: string;
      name: string;
    } | null;
  } | null;
  imageUrl?: string;
  introVideoUrl?: string | null;
  introVideoType?: string | null;
  startDate: string;
  endDate: string;
  language: string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | string;
  totalPrice: number;
  discountPercentage: number;
  faq: Array<{
    title: string;
    description: string;
  }>;
  teacherId: string;
  teacher?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  averageRating?: number;
  ratingCount?: number;
  reviewCount?: number;
  reviews?: BatchReview[];
  viewerReview?: BatchReview | null;
  certificate?: {
    enabled: boolean;
    title?: string | null;
    templateId?: string | null;
    linkedInOrgId?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  imageUrl?: string;
  highlights: string | { content: string };
  subjects: string[];
  batchIds: string[];
  rating?: number;
  experience?: string;
  totalStudents?: number;
  totalCourses?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  batchId: string;
  description?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Schedule {
  id: string;
  audienceType: "ORGANIZATION" | "COURSE";
  topicId?: string;
  batchId?: string;
  subjectId?: string;
  chapterId?: string;
  title: string;
  description?: string;
  subjectName?: string;
  chapterName?: string;
  roomName: string;
  scheduledAt: string;
  duration: number;
  teacherId?: string;
  thumbnailUrl?: string;
  notifyBeforeMinutes?: number;
  tags?: string[];
  status?: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseDetailPageProps {
  basePath?: "admin" | "teacher";
  showSubjectsTab?: boolean;
  showSchedulesTab?: boolean;
  showAnalyticsTab?: boolean;
}
