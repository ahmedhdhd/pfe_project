"use client";

import { type Schedule } from "@/lib/types/schedule";
import { StudentScheduleCard } from "./student-schedule-card";
import { EmptyStateCard } from "@/components/common/empty-state-card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ContentGrid } from "@/components/common/content-grid";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StudentScheduleListProps {
  /** Array of schedules to display */
  schedules: Schedule[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when watch/join is clicked */
  onWatch?: (schedule: Schedule) => void;
  /** Grid columns configuration */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Optional className */
  className?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
}

/**
 * Reusable student schedule list component
 * 
 * Displays schedules in a responsive grid with loading and empty states
 * Optimized for student viewing experience
 * 
 * @example
 * ```tsx
 * <StudentScheduleList
 *   schedules={schedules}
 *   isLoading={isLoading}
 *   onWatch={handleWatch}
 * />
 * ```
 */
export function StudentScheduleList({
  schedules,
  isLoading = false,
  onWatch,
  columns = { mobile: 1, tablet: 1, desktop: 2 },
  className,
  emptyMessage = "No live sessions found",
  emptyDescription = "Upcoming and live sessions will be displayed here.",
}: StudentScheduleListProps) {
  const scheduleItems = Array.isArray(schedules) ? schedules : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (scheduleItems.length === 0) {
    return (
      <EmptyStateCard
        icon={Calendar}
        title={emptyMessage}
        description={emptyDescription}
      />
    );
  }

  return (
    <ContentGrid columns={columns} className={cn(className)}>
      {scheduleItems.map((schedule, index) => (
        <StudentScheduleCard
          key={schedule.id}
          schedule={schedule}
          onWatch={onWatch}
          animationDelay={index * 0.05}
        />
      ))}
    </ContentGrid>
  );
}
