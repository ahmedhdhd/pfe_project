"use client";

import { type Schedule } from "@/lib/types/schedule";
import { ScheduleCard } from "./schedule-card";
import { EmptyStateCard } from "./empty-state-card";
import { LoadingSpinner } from "./loading-spinner";
import { ContentGrid } from "./content-grid";
import { Calendar } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface ScheduleListProps {
  /** Array of schedules to display */
  schedules: Schedule[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Whether user can manage schedules */
  canManage?: boolean;
  /** Callback when edit is clicked */
  onEdit?: (schedule: Schedule) => void;
  /** Callback when delete is clicked */
  onDelete?: (schedule: Schedule) => void;
  /** Callback when watch is clicked */
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
}

/**
 * Reusable schedule list component
 * 
 * Displays schedules in a responsive grid with loading and empty states
 * 
 * @example
 * ```tsx
 * <ScheduleList
 *   schedules={schedules}
 *   isLoading={isLoading}
 *   canManage={true}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onWatch={handleWatch}
 * />
 * ```
 */
export function ScheduleList({
  schedules,
  isLoading = false,
  canManage = false,
  onEdit,
  onDelete,
  onWatch,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  className,
  emptyMessage = "No schedules found",
}: ScheduleListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <EmptyStateCard
        icon={Calendar}
        title={emptyMessage}
        description="Create a new live session to get started"
      />
    );
  }

  return (
    <ContentGrid columns={columns} className={cn(className)}>
      {schedules.map((schedule) => (
        <ScheduleCard
          key={schedule.id}
          schedule={schedule}
          canManage={canManage}
          onEdit={onEdit}
          onDelete={onDelete}
          onWatch={onWatch}
        />
      ))}
    </ContentGrid>
  );
}
