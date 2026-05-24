import { ContentType, VideoType } from "@/components/common/content-form";

export interface CourseContent {
  id: string;
  name: string;
  type: ContentType | "Video" | "Assignment";
  pdfUrl?: string;
  playgroundId?: string;
  videoUrl?: string;
  videoType?: VideoType | "MP4" | "YouTube";
  videoThumbnail?: string;
  videoDuration?: number;
  isCompleted: boolean;
}

export interface Topic {
  id: string;
  name: string;
  subjectId?: string;
  chapterId?: string;
  contents?: CourseContent[];
}

export interface Chapter {
  id: string;
  name: string;
  subjectId?: string;
  courseId?: string;
  topics?: Topic[];
}

export interface Subject {
  id: string;
  name: string;
  courseId: string;
  chapters?: Chapter[];
}

export interface Course {
  id: string;
  title?: string;
  description?: string;
  subjects?: Subject[];
  [key: string]: unknown;
}

export interface CourseProgress {
  overallProgress: number;
  lessonsCount: number;
  completedCount: number;
}
