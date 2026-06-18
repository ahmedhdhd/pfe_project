"use client";

import { Video, BookOpen, Link2 } from "@/components/icons";
import { useGetClientContentsByTopic } from "@/hooks";

export interface TopicContentCountProps {
  /** Topic ID to fetch contents for */
  topicId: string;
}

interface TopicContent {
  type: "Lecture" | "PDF" | "MARKDOWN" | "URL";
  videoUrl?: string;
  pdfUrl?: string;
  markdownBody?: string;
  externalUrl?: string;
}

/**
 * Component to fetch and display content count for a topic
 *
 * Shows the number of videos and PDFs available for a topic
 *
 * @example
 * ```tsx
 * <TopicContentCount topicId="topic-123" />
 * ```
 */
export function TopicContentCount({ topicId }: TopicContentCountProps) {
  const { data: contentsResponse, isLoading } =
    useGetClientContentsByTopic(topicId);
  const contents: TopicContent[] = contentsResponse?.data || [];

  const lectures = contents.filter(
    (content: TopicContent) => content.type === "Lecture" && content.videoUrl
  );
  const pdfs = contents.filter(
    (content: TopicContent) => content.type === "PDF" && content.pdfUrl
  );
  const documents = contents.filter(
    (content: TopicContent) => content.type === "MARKDOWN" && content.markdownBody
  );
  const links = contents.filter(
    (content: TopicContent) => content.type === "URL" && content.externalUrl
  );

  if (isLoading) {
    return <div className="h-4 w-24 bg-muted rounded animate-pulse" />;
  }

  const totalContent = lectures.length + pdfs.length + documents.length + links.length;

  if (totalContent === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {lectures.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Video className="h-3 w-3" />
          <span>
            {lectures.length} {lectures.length === 1 ? "Video" : "Videos"}
          </span>
        </div>
      )}
      {pdfs.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          <span>
            {pdfs.length} {pdfs.length === 1 ? "PDF" : "PDFs"}
          </span>
        </div>
      )}
      {documents.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          <span>
            {documents.length} {documents.length === 1 ? "Article" : "Articles"}
          </span>
        </div>
      )}
      {links.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="h-3 w-3" />
          <span>
            {links.length} {links.length === 1 ? "Link" : "Links"}
          </span>
        </div>
      )}
    </div>
  );
}
