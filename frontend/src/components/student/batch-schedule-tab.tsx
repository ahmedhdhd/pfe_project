"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { PremiumTabsTrigger } from "@/components/common/premium-tabs-trigger";
import { useGetClientSchedulesByBatch } from "@/hooks";
import { type Schedule, type ScheduleStatus } from "@/lib/types/schedule";
import { StudentScheduleList } from "./student-schedule-list";
import { SectionHeader } from "@/components/common/section-header";
import { Calendar, Radio, Video } from "lucide-react";

/**
 * Batch schedule tab component for students
 *
 * Displays schedules for a purchased batch with filtering by status
 * Premium UI with tabs for All, Upcoming, Live, and Completed schedules
 *
 * @example
 * ```tsx
 * <BatchScheduleTab />
 * ```
 */
export function BatchScheduleTab() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const [activeTab, setActiveTab] = useState<
    "all" | "upcoming" | "live" | "completed"
  >("all");

  const { data: schedulesResponse, isLoading } =
    useGetClientSchedulesByBatch(batchId);

  const allSchedules: Schedule[] = useMemo(
    () => schedulesResponse?.data || [],
    [schedulesResponse?.data]
  );

  // Helper function to calculate schedule status (matches StudentScheduleCard logic)
  const calculateScheduleStatus = (schedule: Schedule): ScheduleStatus => {
    const scheduledDate = new Date(schedule.scheduledAt);
    const now = new Date();
    const isPastSchedule = scheduledDate < now;

    // Calculate if schedule is currently live (within scheduled time window)
    const scheduledEndTime = new Date(scheduledDate);
    scheduledEndTime.setMinutes(
      scheduledEndTime.getMinutes() + schedule.duration
    );

    const nowTime = now.getTime();
    const startTime = scheduledDate.getTime();
    const endTime = scheduledEndTime.getTime();

    const bufferMs = 5 * 60 * 1000; // 5 minutes
    const isCurrentlyLive =
      nowTime >= startTime - bufferMs &&
      nowTime <= endTime &&
      schedule.status !== "COMPLETED" &&
      schedule.status !== "CANCELLED";

    if (isCurrentlyLive) {
      return "LIVE";
    } else if (schedule.status === "LIVE") {
      return "LIVE";
    } else if (schedule.status) {
      return schedule.status;
    } else {
      return isPastSchedule ? "COMPLETED" : "SCHEDULED";
    }
  };

  // Filter schedules based on active tab
  const filteredSchedules = useMemo(() => {
    switch (activeTab) {
      case "upcoming":
        return allSchedules.filter((schedule) => {
          const status = calculateScheduleStatus(schedule);
          return status === "SCHEDULED";
        });
      case "live":
        return allSchedules.filter((schedule) => {
          const status = calculateScheduleStatus(schedule);
          return status === "LIVE";
        });
      case "completed":
        return allSchedules.filter((schedule) => {
          const status = calculateScheduleStatus(schedule);
          return status === "COMPLETED";
        });
      default:
        return allSchedules.filter(
          (schedule) => schedule.status !== "CANCELLED"
        );
    }
  }, [allSchedules, activeTab]);

  const handleWatch = (schedule: Schedule) => {
    if (schedule.roomName) {
      router.push(`/student/batches/${batchId}/schedule/${schedule.id}`);
    }
  };

  // Calculate counts using the same status calculation logic
  const counts = useMemo(() => {
    const upcoming = allSchedules.filter(
      (s) => calculateScheduleStatus(s) === "SCHEDULED"
    ).length;
    const live = allSchedules.filter(
      (s) => calculateScheduleStatus(s) === "LIVE"
    ).length;
    const completed = allSchedules.filter(
      (s) => calculateScheduleStatus(s) === "COMPLETED"
    ).length;
    const all = allSchedules.filter((s) => s.status !== "CANCELLED").length;

    return { all, upcoming, live, completed };
  }, [allSchedules]);

  return (
    <div className="space-y-6 lg:space-y-8">
      <SectionHeader
        title="Live Classes"
        subtitle={`${counts.all} ${
          counts.all === 1 ? "class" : "classes"
        } available`}
        showAccent
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as "all" | "upcoming" | "live" | "completed")
        }
        className="w-full"
      >
        <TabsList className="mb-6 flex h-11 items-center justify-start gap-2 rounded-lg bg-transparent p-0 w-full border-b border-border/60 shrink-0">
          <PremiumTabsTrigger value="all" icon={Calendar} count={counts.all}>
            All
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="upcoming" icon={Calendar} count={counts.upcoming}>
            Upcoming
          </PremiumTabsTrigger>
          <PremiumTabsTrigger
            value="live"
            icon={Radio}
            count={counts.live}
            badgeVariant="danger"
          >
            Live
          </PremiumTabsTrigger>
          <PremiumTabsTrigger
            value="completed"
            icon={Video}
            count={counts.completed}
            mobileLabel="Done"
          >
            Completed
          </PremiumTabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <StudentScheduleList
            schedules={filteredSchedules}
            isLoading={isLoading}
            onWatch={handleWatch}
            emptyMessage="No Classes Scheduled"
            emptyDescription="Upcoming and live LiveKit sessions will be displayed here. Check back soon for new classes."
          />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-0">
          <StudentScheduleList
            schedules={filteredSchedules}
            isLoading={isLoading}
            onWatch={handleWatch}
            emptyMessage="No Upcoming Classes"
            emptyDescription="Upcoming live sessions will appear here once they are scheduled."
          />
        </TabsContent>

        <TabsContent value="live" className="mt-0">
          <StudentScheduleList
            schedules={filteredSchedules}
            isLoading={isLoading}
            onWatch={handleWatch}
            emptyMessage="No Live Classes"
            emptyDescription="Live sessions will appear here when the teacher opens the room."
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <StudentScheduleList
            schedules={filteredSchedules}
            isLoading={isLoading}
            onWatch={handleWatch}
            emptyMessage="No Completed Classes"
            emptyDescription="Completed live sessions will appear here once their scheduled time has passed."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
