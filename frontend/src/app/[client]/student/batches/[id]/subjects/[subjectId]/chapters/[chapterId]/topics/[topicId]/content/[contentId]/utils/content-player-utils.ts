export interface Content {
  id: string;
  name: string;
  topicId: string;
  type: "Lecture" | "PDF" | "MARKDOWN" | "URL";
  pdfUrl?: string;
  markdownBody?: string;
  externalUrl?: string;
  externalProvider?: string;
  videoUrl?: string;
  videoType?: "YOUTUBE" | "HLS";
  videoThumbnail?: string;
  videoDuration?: number;
  isCompleted?: boolean;
  description?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
}

export interface Chapter {
  id: string;
  name: string;
  subjectId: string;
}

export interface Topic {
  id: string;
  name: string;
  chapterId: string;
  description?: string;
  quiz?: {
    title?: string;
    description?: string;
    passingPercentage: number;
    questions: Array<{
      id: string;
      text: string;
      type: "MCQ" | "TRUE_FALSE";
      explanation?: string;
      options?: Array<{ id: string; text: string }>;
    }>;
  } | null;
  latestQuizAttempt?: {
    id: string;
    attemptNumber: number;
    score: number;
    percentage: number;
    correctCount: number;
    totalQuestions: number;
    isPassed: boolean;
    completedAt: string;
  } | null;
}

export type VideoType =
  | "video/mp4"
  | "application/x-mpegURL"
  | "video/webm"
  | "video/youtube";

function isYouTubeUrl(value?: string): boolean {
  if (!value) return false;
  return /youtu\.be|youtube\.com/i.test(value);
}

function isHlsUrl(value?: string): boolean {
  if (!value) return false;
  return /\.m3u8($|[?#])/i.test(value);
}

export function getVideoType(
  videoType?: string,
  videoUrl?: string
): "video/mp4" | "application/x-mpegURL" | "video/webm" | "video/youtube" {
  if (isYouTubeUrl(videoUrl)) return "video/youtube";
  if (isHlsUrl(videoUrl)) return "application/x-mpegURL";

  if (!videoType) return "video/mp4";
  if (videoType === "HLS") {
    return videoUrl && !isHlsUrl(videoUrl)
      ? "video/mp4"
      : "application/x-mpegURL";
  }
  if (videoType === "YOUTUBE") return "video/youtube";
  return "video/mp4";
}

export function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function buildContentPath(
  batchId: string,
  subjectId: string,
  chapterId: string,
  topicId: string,
  contentId: string
): string {
  return `/student/batches/${batchId}/subjects/${subjectId}/chapters/${chapterId}/topics/${topicId}/content/${contentId}`;
}

export function buildTopicPath(
  batchId: string,
  subjectId: string,
  chapterId: string,
  topicId: string
): string {
  return `/student/batches/${batchId}/subjects/${subjectId}/chapters/${chapterId}/topics/${topicId}`;
}
