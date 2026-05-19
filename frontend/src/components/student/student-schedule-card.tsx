"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Play,
  Radio,
  CheckCircle2,
  Video,
} from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { type Schedule, type ScheduleStatus } from "@/lib/types/schedule";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";

export interface StudentScheduleCardProps {
  /** Schedule data */
  schedule: Schedule;
  /** Callback when watch/join is clicked */
  onWatch?: (schedule: Schedule) => void;
  /** Optional animation delay */
  animationDelay?: number;
  /** Optional className */
  className?: string;
}

/**
 * Premium student schedule card component
 *
 * Displays schedule information optimized for student viewing with:
 * - Premium visual design with thumbnails
 * - Live status indicators
 * - Join/Watch buttons
 * - Mobile responsive layout
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <StudentScheduleCard
 *   schedule={schedule}
 *   onWatch={(s) => handleJoin(s)}
 * />
 * ```
 */
export function StudentScheduleCard({
  schedule,
  onWatch,
  animationDelay = 0,
  className,
}: StudentScheduleCardProps) {
  const scheduledDate = new Date(schedule.scheduledAt);
  const now = new Date();
  const isUpcoming = isFuture(scheduledDate);
  const isPastSchedule = isPast(scheduledDate);

  // Calculate if schedule is currently live (within scheduled time window)
  const scheduledEndTime = new Date(scheduledDate);
  scheduledEndTime.setMinutes(
    scheduledEndTime.getMinutes() + schedule.duration
  );

  // Use getTime() for accurate numeric comparison
  const nowTime = now.getTime();
  const startTime = scheduledDate.getTime();
  const endTime = scheduledEndTime.getTime();

  // Check if currently within the scheduled time window
  // Allow 5 minutes buffer before start time to show as live
  const bufferMs = 5 * 60 * 1000; // 5 minutes in milliseconds
  const isCurrentlyLive =
    nowTime >= startTime - bufferMs &&
    nowTime <= endTime &&
    schedule.status !== "COMPLETED" &&
    schedule.status !== "CANCELLED";

  // Determine status: prioritize LIVE if currently within time window, then API status, then calculated status
  let status: ScheduleStatus;
  if (isCurrentlyLive) {
    // Override API status if we're within the time window
    status = "LIVE";
  } else if (schedule.status === "LIVE") {
    // Respect explicit LIVE status from API
    status = "LIVE";
  } else if (schedule.status) {
    // Use API status for other cases
    status = schedule.status;
  } else {
    // Calculate based on time if no API status
    status = isPastSchedule ? "COMPLETED" : "SCHEDULED";
  }

  const getStatusConfig = (status: ScheduleStatus) => {
    switch (status) {
      case "LIVE":
        return {
          label: "Live Now",
          icon: Radio,
          className:
            "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
          badgeClassName: "bg-red-600 dark:bg-red-700 text-white",
        };
      case "COMPLETED":
        return {
          label: "Completed",
          icon: CheckCircle2,
          className:
            "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
          badgeClassName: "bg-green-600 dark:bg-green-700 text-white",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          icon: Calendar,
          className:
            "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800",
          badgeClassName: "bg-gray-600 dark:bg-gray-700 text-white",
        };
      default:
        return {
          label: "Scheduled",
          icon: Calendar,
          className:
            "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
          badgeClassName: "bg-blue-600 dark:bg-blue-700 text-white",
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleWatch = () => {
    if (onWatch && schedule.roomName) {
      onWatch(schedule);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animationDelay }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden border transition-all duration-300 hover:shadow-xl hover:scale-[1.01]",
          status === "LIVE" &&
            "border-red-500/50 dark:border-red-500/50 shadow-red-500/10 dark:shadow-red-500/20",
          className
        )}
      >
        <CardContent className="p-0">
          {/* Compact Horizontal Layout with Square Thumbnail */}
          <div className="flex gap-3 p-3">
            {/* Square Thumbnail */}
            {schedule.thumbnailUrl ? (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={schedule.thumbnailUrl}
                  alt={schedule.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {status === "LIVE" && (
                  <div className="absolute inset-0 bg-red-500/30 dark:bg-red-500/40 flex items-center justify-center">
                    <motion.div
                      className="flex items-center gap-1 bg-red-600 dark:bg-red-700 text-white px-1.5 py-0.5 rounded-full shadow-lg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Radio className="h-2.5 w-2.5 animate-pulse" />
                      <span className="font-bold text-[10px]">LIVE</span>
                    </motion.div>
                  </div>
                )}
                {onWatch &&
                  schedule.roomName &&
                  (status === "LIVE" || status === "SCHEDULED") && (
                    <div className="absolute inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        onClick={handleWatch}
                        className="h-6 px-2 text-[10px] gap-1 shadow-xl"
                      >
                        <Play className="h-2.5 w-2.5" />
                        {status === "LIVE" ? "Join" : "Watch"}
                      </Button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center rounded-lg">
                <Video className="h-6 w-6 sm:h-8 sm:w-8 text-primary/40 dark:text-primary/50" />
                {status === "LIVE" && (
                  <div className="absolute inset-0 bg-red-500/30 dark:bg-red-500/40 flex items-center justify-center rounded-lg">
                    <motion.div
                      className="flex items-center gap-1 bg-red-600 dark:bg-red-700 text-white px-1.5 py-0.5 rounded-full shadow-lg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Radio className="h-2.5 w-2.5 animate-pulse" />
                      <span className="font-bold text-[10px]">LIVE</span>
                    </motion.div>
                  </div>
                )}
              </div>
            )}

            {/* Compact Content Section */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                    {schedule.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 text-[10px] px-1.5 py-0.5",
                      statusConfig.className
                    )}
                  >
                    <statusConfig.icon className="h-2.5 w-2.5 mr-0.5" />
                    <span className="hidden sm:inline text-[10px]">
                      {statusConfig.label}
                    </span>
                    <span className="sm:hidden text-[10px]">
                      {statusConfig.label.slice(0, 4)}
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Metadata - Compact */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {format(scheduledDate, "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {format(scheduledDate, "h:mm a")} •{" "}
                    {formatDuration(schedule.duration)}
                  </span>
                </div>
                <span className="truncate text-xs">
                  {schedule.audienceType === "ORGANIZATION"
                    ? "Organization-wide"
                    : "Course live session"}
                </span>
              </div>

              {/* Actions - Compact */}
              <div className="flex items-center gap-2 pt-2 mt-auto">
                {onWatch &&
                  schedule.roomName &&
                  (status === "LIVE" || status === "SCHEDULED") && (
                    <Button
                      size="sm"
                      variant={status === "LIVE" ? "default" : "outline"}
                      onClick={handleWatch}
                      className={cn(
                        "flex-1 text-xs h-7",
                        status === "LIVE" &&
                          "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                      )}
                    >
                      {status === "LIVE" ? (
                        <>
                          <Radio className="h-3 w-3 mr-1 animate-pulse" />
                          <span>Join Live</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          <span>Join Session</span>
                        </>
                      )}
                    </Button>
                  )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
