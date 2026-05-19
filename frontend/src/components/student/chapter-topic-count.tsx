"use client";

import { FileText } from "lucide-react";
import { useGetClientTopicsByChapter } from "@/hooks";

export interface ChapterTopicCountProps {
  /** Chapter ID to fetch topics for */
  chapterId: string;
}

/**
 * Component to fetch and display topic count for a chapter
 *
 * @example
 * ```tsx
 * <ChapterTopicCount chapterId="chapter-123" />
 * ```
 */
export function ChapterTopicCount({ chapterId }: ChapterTopicCountProps) {
  const { data: topicsResponse, isLoading } =
    useGetClientTopicsByChapter(chapterId);
  const topicCount = topicsResponse?.data?.length || 0;

  if (isLoading) {
    return <div className="h-4 w-16 bg-muted rounded animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-1.5">
      <FileText className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {topicCount} {topicCount === 1 ? "Topic" : "Topics"}
      </span>
    </div>
  );
}
