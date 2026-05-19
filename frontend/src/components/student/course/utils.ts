import { CourseContent } from "./types";
import { VideoType } from "@/components/common/content-form";
import {
  FileText,
  Video as VideoIcon,
  BookOpen,
  Clipboard,
  LucideIcon,
} from "lucide-react";

export type VideoMimeType =
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

/**
 * Gets the icon component for a content type
 */
export function getContentTypeIcon(type: CourseContent["type"]): LucideIcon {
  switch (type) {
    case "Video":
      return VideoIcon;
    case "PDF":
      return FileText;
    case "Assignment":
      return Clipboard;
    case "Lecture":
    default:
      return BookOpen;
  }
}

/**
 * Gets the color classes for a content type badge
 */
export function getContentTypeColor(type: CourseContent["type"]): string {
  const colors: Record<string, string> = {
    Lecture: "bg-blue-100 text-blue-800",
    Video: "bg-green-100 text-green-800",
    PDF: "bg-purple-100 text-purple-800",
    Assignment: "bg-orange-100 text-orange-800",
  };
  return colors[type] || colors.Lecture;
}

/**
 * Converts video type to Video.js MIME type
 * Defaults to MP4 for direct file URLs ( Supabase uploads)
 */
export function getVideoMimeType(
  videoType?: string,
  videoUrl?: string
): VideoMimeType {
  if (isYouTubeUrl(videoUrl)) return "video/youtube";
  if (isHlsUrl(videoUrl)) return "application/x-mpegURL";

  if (!videoType) return "video/mp4";

  const upperType = videoType.toUpperCase();

  if (upperType === VideoType.HLS || videoType === "HLS") {
    return videoUrl && !isHlsUrl(videoUrl)
      ? "video/mp4"
      : "application/x-mpegURL";
  }
  if (
    upperType === VideoType.YOUTUBE ||
    videoType === "YOUTUBE" ||
    videoType === "YouTube"
  ) {
    return "video/youtube";
  }
  // Default to MP4 for all other cases (including direct Supabase URLs)
  return "video/mp4";
}

/**
 * Calculates course progress from content
 */
export function calculateCourseProgress(
  subjects?: { chapters?: { topics?: { contents?: CourseContent[] }[] }[] }[]
): { overallProgress: number; lessonsCount: number; completedCount: number } {
  if (!subjects || !Array.isArray(subjects)) {
    return { overallProgress: 0, lessonsCount: 0, completedCount: 0 };
  }

  let totalContent = 0;
  let completedContent = 0;

  subjects.forEach((subject) => {
    subject.chapters?.forEach((chapter) => {
      chapter.topics?.forEach((topic) => {
        topic.contents?.forEach((content) => {
          totalContent++;
          if (content.isCompleted) {
            completedContent++;
          }
        });
      });
    });
  });

  const overallProgress =
    totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : 0;

  return {
    overallProgress,
    lessonsCount: totalContent,
    completedCount: completedContent,
  };
}
