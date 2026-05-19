"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Link2,
  Video,
  Eye,
  PlayCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useContentProgress } from "@/hooks/api";
import { normalizeExternalUrl } from "@/lib/utils/external-resource";

export interface Content {
  id: string;
  name: string;
  description?: string;
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
}

export interface ContentCardProps {
  /** Content data */
  content: Content;
  /** Function to format duration from seconds */
  formatDuration: (seconds?: number) => string;
  /** Callback when video is clicked */
  onPlayVideo: (content: Content) => void;
  /** Optional animation delay */
  animationDelay?: number;
  /** Whether to show progress tracking (default: true) */
  showProgress?: boolean;
}

/**
 * Reusable content card component for displaying lectures and PDFs
 *
 * Features:
 * - Video thumbnail with play button overlay
 * - PDF icon placeholder
 * - Completion status badge
 * - Duration display for videos
 * - Watch/Download buttons
 *
 * @example
 * ```tsx
 * <ContentCard
 *   content={content}
 *   formatDuration={(s) => formatDuration(s)}
 *   onPlayVideo={(c) => handlePlay(c)}
 * />
 * ```
 */
export function ContentCard({
  content,
  formatDuration,
  onPlayVideo,
  animationDelay = 0,
  showProgress = true,
}: ContentCardProps) {
  const router = useRouter();
  const isLecture = content.type === "Lecture" && content.videoUrl;
  const isPdf = content.type === "PDF" && content.pdfUrl;
  const isExternalUrl = content.type === "URL" && content.externalUrl;

  // Fetch progress data if enabled
  const { data: progressData } = useContentProgress(
    showProgress && content.id ? content.id : ""
  );

  const progressPercentage = progressData?.data?.watchPercentage || 0;
  const isCompleted =
    progressData?.data?.isCompleted || content.isCompleted || false;

  const handleViewPdf = () => {
    // Navigate to PDF viewer route with topicId as query parameter
    if (content.topicId) {
      router.push(
        `/student/content/${content.id}/pdf?topicId=${content.topicId}`
      );
    } else {
      router.push(`/student/content/${content.id}/pdf`);
    }
  };

  const handlePlayVideo = () => {
    onPlayVideo(content);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animationDelay }}
    >
      <Card className="group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full flex flex-col hover:border-primary/50">
        <CardContent className="relative p-0 flex flex-col h-full">
          {/* Thumbnail/Icon Section */}
          {isLecture && content.videoThumbnail ? (
            <div
              className="relative aspect-video overflow-hidden bg-muted cursor-pointer group/thumbnail"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayVideo();
              }}
            >
              <motion.img
                src={content.videoThumbnail}
                alt={content.name}
                className="w-full h-full object-cover"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-0 bg-black/30 flex items-center justify-center"
                initial={{ opacity: 0.3 }}
                whileHover={{ opacity: 0.2 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="h-14 w-14 rounded-full bg-white dark:bg-white/95 flex items-center justify-center shadow-2xl border-2 border-white/20 backdrop-blur-sm"
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 17,
                  }}
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <PlayCircle className="h-7 w-7 text-primary fill-primary/20" />
                  </motion.div>
                </motion.div>
              </motion.div>
              {isCompleted && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </div>
              )}
              {/* Progress bar overlay */}
              {showProgress &&
                progressPercentage > 0 &&
                !isCompleted &&
                isLecture && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                    <Progress
                      value={progressPercentage}
                      className="h-1 rounded-none"
                    />
                  </div>
                )}
            </div>
          ) : (
            <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              {isLecture ? (
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Video className="h-8 w-8 text-primary" />
                </div>
              ) : content.type === "URL" ? (
                <div className="h-16 w-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Link2 className="h-8 w-8 text-blue-600" />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
              )}
              {isCompleted && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Content Info */}
          <div className="p-6 flex flex-col flex-1">
            <div className="mb-3">
              <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {content.name}
              </h3>
              {content.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {content.description}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="secondary"
                  className={
                    content.type === "Lecture"
                      ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 text-xs"
                      : content.type === "URL"
                      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-xs"
                      : "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-xs"
                  }
                >
                  {content.type}
                </Badge>
                {isLecture && content.videoDuration && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDuration(content.videoDuration)}
                  </div>
                )}
                {content.videoType && (
                  <Badge variant="outline" className="text-xs">
                    {content.videoType}
                  </Badge>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <div className="mt-auto pt-4 border-t border-border/50">
              {isLecture && content.videoUrl ? (
                <Button
                  size="sm"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayVideo();
                  }}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Watch Now
                </Button>
              ) : isPdf && content.pdfUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewPdf();
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View PDF
                </Button>
              ) : isExternalUrl ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const normalizedUrl = normalizeExternalUrl(content.externalUrl);
                    if (!normalizedUrl) return;
                    window.open(normalizedUrl, "_blank", "noreferrer");
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open Resource
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
