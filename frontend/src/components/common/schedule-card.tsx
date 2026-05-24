"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Edit,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Radio,
  Video,
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { type Schedule, type ScheduleStatus } from "@/lib/types/schedule";
import { cn } from "@/lib/utils";
import Image from "next/image";

export interface ScheduleCardProps {
  /** Schedule data */
  schedule: Schedule;
  /** Whether user can manage this schedule */
  canManage?: boolean;
  /** Callback when edit is clicked */
  onEdit?: (schedule: Schedule) => void;
  /** Callback when delete is clicked */
  onDelete?: (schedule: Schedule) => void;
  /** Callback when play/watch is clicked */
  onWatch?: (schedule: Schedule) => void;
  /** Optional className */
  className?: string;
}

/**
 * Reusable schedule card component
 *
 * Displays schedule information with status badges, actions, and metadata
 *
 * @example
 * ```tsx
 * <ScheduleCard
 *   schedule={schedule}
 *   canManage={true}
 *   onEdit={(s) => handleEdit(s)}
 *   onDelete={(s) => handleDelete(s)}
 *   onWatch={(s) => handleWatch(s)}
 * />
 * ```
 */
export function ScheduleCard({
  schedule,
  canManage = false,
  onEdit,
  onDelete,
  onWatch,
  className,
}: ScheduleCardProps) {
  const scheduledDate = new Date(schedule.scheduledAt);
  const isUpcoming = isFuture(scheduledDate);
  const isPastSchedule = isPast(scheduledDate);
  const status =
    schedule.status || (isPastSchedule ? "COMPLETED" : "SCHEDULED");

  const getStatusConfig = (status: ScheduleStatus) => {
    switch (status) {
      case "LIVE":
        return {
          label: "Live",
          icon: Radio,
          className:
            "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
        };
      case "COMPLETED":
        return {
          label: "Completed",
          icon: CheckCircle2,
          className:
            "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
        };
      case "CANCELLED":
        return {
          label: "Cancelled",
          icon: XCircle,
          className:
            "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-800",
        };
      default:
        return {
          label: "Scheduled",
          icon: Calendar,
          className:
            "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const watchLabel =
    status === "COMPLETED"
      ? "View Detail"
      : "Open Room";
  const watchLabelMobile =
    status === "COMPLETED"
      ? "Detail"
      : "Open";

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all duration-300 hover:shadow-lg",
        status === "LIVE" && "border-red-500/50 shadow-red-500/10",
        className
      )}
    >
      <CardContent className="p-0">
        {/* Thumbnail Section */}
        {schedule.thumbnailUrl ? (
          <div className="relative aspect-video overflow-hidden bg-muted">
            <Image
              src={schedule.thumbnailUrl}
              alt={schedule.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {status === "LIVE" && (
              <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/30 flex items-center justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-red-600 dark:bg-red-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                  <Radio className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse" />
                  <span className="font-semibold text-xs sm:text-sm">
                    LIVE NOW
                  </span>
                </div>
              </div>
            )}
            {onWatch && status !== "CANCELLED" && (
              <div className="absolute inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="lg"
                  onClick={() => onWatch(schedule)}
                  className="gap-2 text-sm sm:text-base"
                >
                  <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="hidden sm:inline">{watchLabel}</span>
                  <span className="sm:hidden">{watchLabelMobile}</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative aspect-video bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center">
            <Video className="h-12 w-12 sm:h-16 sm:w-16 text-primary/40 dark:text-primary/50" />
            {status === "LIVE" && (
              <div className="absolute inset-0 bg-red-500/20 dark:bg-red-500/30 flex items-center justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-red-600 dark:bg-red-700 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full">
                  <Radio className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-pulse" />
                  <span className="font-semibold text-xs sm:text-sm">
                    LIVE NOW
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Header */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base sm:text-lg leading-tight line-clamp-2 flex-1">
                {schedule.title}
              </h3>
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0 text-xs sm:text-sm",
                  statusConfig.className
                )}
              >
                <statusConfig.icon className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">{statusConfig.label}</span>
                <span className="sm:hidden">
                  {statusConfig.label.slice(0, 3)}
                </span>
              </Badge>
            </div>
            {schedule.description && (
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {schedule.description}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">
                {format(scheduledDate, "MMM dd, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">
                {format(scheduledDate, "h:mm a")} •{" "}
                {formatDuration(schedule.duration)}
              </span>
            </div>
            <Badge variant="outline" className="text-xs shrink-0">
              {schedule.audienceType === "ORGANIZATION"
                ? "Organization-wide"
                : "Course live session"}
            </Badge>
          </div>

          {/* Time Info */}
          {isUpcoming && (
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(scheduledDate, { addSuffix: true })}
            </div>
          )}

          {/* Tags */}
          {schedule.tags && schedule.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {schedule.tags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs py-0.5 px-1.5 sm:px-2"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-border/50 dark:border-border/30">
            {onWatch && status !== "CANCELLED" && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onWatch(schedule)}
                className="flex-1 text-xs sm:text-sm"
              >
                <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden sm:inline">{watchLabel}</span>
                <span className="sm:hidden">{watchLabelMobile}</span>
              </Button>
            )}
            {canManage && (
              <>
                {onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(schedule)}
                    className="shrink-0"
                  >
                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(schedule)}
                    className="text-destructive hover:text-destructive dark:text-destructive dark:hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
