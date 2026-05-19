"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, FileText, Download } from "lucide-react";
import { type Content } from "./content-card";

// Re-export Content type for convenience
export type { Content };

export interface ModalContentCardProps {
  /** Content data */
  content: Content;
  /** Function to format duration from seconds */
  formatDuration: (seconds?: number) => string;
  /** Callback when video is clicked (optional, for modal context) */
  onPlayVideo?: (content: Content) => void;
}

/**
 * Compact content card component for modal contexts
 *
 * Displays content in a horizontal, compact layout suitable for modals
 *
 * @example
 * ```tsx
 * <ModalContentCard
 *   content={content}
 *   formatDuration={(s) => formatDuration(s)}
 *   onPlayVideo={(c) => handlePlay(c)}
 * />
 * ```
 */
export function ModalContentCard({
  content,
  formatDuration,
  onPlayVideo,
}: ModalContentCardProps) {
  const isLecture = content.type === "Lecture" && content.videoUrl;
  const isPdf = content.type === "PDF" && content.pdfUrl;

  const handleOpenPdf = (url: string) => {
    window.open(url, "_blank");
  };

  const handlePlayVideo = () => {
    if (onPlayVideo) {
      onPlayVideo(content);
    }
  };

  return (
    <div className="border rounded-md p-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isLecture && <Video className="h-4 w-4 text-green-600 shrink-0" />}
          {isPdf && <FileText className="h-4 w-4 text-purple-600 shrink-0" />}
          <h4 className="font-medium text-sm truncate flex-1">
            {content.name}
          </h4>
          <Badge
            variant="secondary"
            className={
              content.type === "Lecture"
                ? "bg-green-100 text-green-800 text-xs py-0 px-1.5"
                : content.type === "PDF"
                ? "bg-purple-100 text-purple-800 text-xs py-0 px-1.5"
                : "bg-blue-100 text-blue-800 text-xs py-0 px-1.5"
            }
          >
            {content.type}
          </Badge>
          {isLecture && content.videoDuration && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDuration(content.videoDuration)}
            </span>
          )}
          {content.videoType && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 shrink-0">
              {content.videoType}
            </Badge>
          )}
          {content.isCompleted && (
            <Badge
              variant="default"
              className="bg-green-600 text-xs py-0 px-1.5 shrink-0"
            >
              ✓
            </Badge>
          )}
        </div>

        {isPdf && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-7 text-xs px-2"
            onClick={() => content.pdfUrl && handleOpenPdf(content.pdfUrl)}
          >
            <Download className="h-3 w-3 mr-1" />
            Open
          </Button>
        )}
        {isLecture && onPlayVideo && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-7 text-xs px-2"
            onClick={handlePlayVideo}
          >
            <Video className="h-3 w-3 mr-1" />
            Play
          </Button>
        )}
      </div>
    </div>
  );
}
