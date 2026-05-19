"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Clock, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDuration } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  title: string;
  subject: string;
  thumbnail: string;
  duration: number;
  watchedDuration: number;
  lastWatchedAt: Date;
  batchName: string;
  index?: number;
  /** Optional href for navigation. If provided, will be used instead of constructing from id */
  href?: string;
}

export function VideoCard({
  id,
  title,
  subject,
  duration,
  watchedDuration,
  batchName,
  index = 0,
  href,
}: VideoCardProps) {
  const progressPercentage = (watchedDuration / duration) * 100;

  // Use provided href or fallback to generic route
  const videoHref = href || `/student/videos/${id}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="w-full"
    >
      <Link href={videoHref}>
        <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 cursor-pointer h-full p-0">
          <CardContent className="px-4 py-4 sm:p-4 h-full flex items-center">
            <div className="flex items-center gap-4 w-full">
              {/* Play Icon */}
              <div className="shrink-0 h-14 w-14 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Play className="h-7 w-7 sm:h-6 sm:w-6 text-primary fill-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-2">
                {/* Title and Subject */}
                <div className="space-y-1.5 sm:space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-base sm:text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors flex-1 min-h-10 sm:min-h-9">
                      {title}
                    </h3>

                    {/* Duration - Desktop */}
                    <div className="hidden sm:flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDuration(duration)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium">
                      {subject}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      {batchName}
                    </span>

                    {/* Duration - Mobile */}
                    <span className="sm:hidden text-xs text-muted-foreground flex items-center gap-1.5 ml-auto">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(duration)}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-[11px]">
                    <span className="text-muted-foreground">
                      {formatDuration(watchedDuration)} /{" "}
                      {formatDuration(duration)}
                    </span>
                    <span className="font-semibold text-primary">
                      {Math.round(progressPercentage)}% Complete
                    </span>
                  </div>
                  <Progress
                    value={progressPercentage}
                    className="h-2 sm:h-1.5"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
