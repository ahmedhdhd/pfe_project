"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useGetClientSchedulesByBatch } from "@/hooks";
import { type Schedule } from "@/lib/types/schedule";
import { StudentScheduleList } from "./student-schedule-list";
import { SectionHeader } from "@/components/common/section-header";

/**
 * Batch classes tab component for students
 *
 * Displays completed live sessions for a purchased batch
 * Premium UI optimized for reviewing past sessions
 *
 * @example
 * ```tsx
 * <BatchClassesTab />
 * ```
 */
export function BatchClassesTab() {
  const params = useParams();
  const batchId = params.id as string;

  const { data: schedulesResponse, isLoading } =
    useGetClientSchedulesByBatch(batchId);

  const allSchedules: Schedule[] = useMemo(
    () => schedulesResponse?.data || [],
    [schedulesResponse?.data]
  );

  // Filter completed live sessions for historical review
  const schedules = useMemo(
    () => allSchedules.filter((schedule) => schedule.status === "COMPLETED"),
    [allSchedules]
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <SectionHeader
        title="Past Live Sessions"
        subtitle={`${schedules.length} ${
          schedules.length === 1 ? "session" : "sessions"
        } completed`}
        showAccent
      />

      <StudentScheduleList
        schedules={schedules}
        isLoading={isLoading}
        emptyMessage="No Past Sessions Yet"
        emptyDescription="Completed live sessions will be listed here after they finish."
      />
    </div>
  );
}
