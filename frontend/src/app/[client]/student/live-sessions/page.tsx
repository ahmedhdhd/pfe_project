"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Radio, Video } from "lucide-react";
import { PremiumTabsTrigger } from "@/components/common/premium-tabs-trigger";
import { SectionHeader } from "@/components/common/section-header";
import { StudentScheduleList } from "@/components/student/student-schedule-list";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useGetClientSchedules } from "@/hooks";
import type { Schedule, ScheduleStatus } from "@/lib/types/schedule";

export default function StudentLiveSessionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "all" | "upcoming" | "live" | "completed"
  >("all");
  const { data: schedulesResponse, isLoading } = useGetClientSchedules();
  const allSchedules: Schedule[] = useMemo(
    () => schedulesResponse?.data || [],
    [schedulesResponse?.data]
  );

  const calculateStatus = (schedule: Schedule): ScheduleStatus => {
    const scheduledDate = new Date(schedule.scheduledAt);
    const scheduledEndTime = new Date(scheduledDate);
    scheduledEndTime.setMinutes(scheduledEndTime.getMinutes() + schedule.duration);
    const now = Date.now();
    const bufferMs = 5 * 60 * 1000;
    const isLive =
      now >= scheduledDate.getTime() - bufferMs &&
      now <= scheduledEndTime.getTime() &&
      schedule.status !== "COMPLETED" &&
      schedule.status !== "CANCELLED";

    if (isLive) return "LIVE";
    if (schedule.status) return schedule.status;
    return scheduledDate.getTime() < now ? "COMPLETED" : "SCHEDULED";
  };

  const filteredSchedules = useMemo(() => {
    if (activeTab === "upcoming") {
      return allSchedules.filter((schedule) => calculateStatus(schedule) === "SCHEDULED");
    }
    if (activeTab === "live") {
      return allSchedules.filter((schedule) => calculateStatus(schedule) === "LIVE");
    }
    if (activeTab === "completed") {
      return allSchedules.filter((schedule) => calculateStatus(schedule) === "COMPLETED");
    }
    return allSchedules.filter((schedule) => schedule.status !== "CANCELLED");
  }, [activeTab, allSchedules]);

  const counts = useMemo(
    () => ({
      all: allSchedules.filter((schedule) => schedule.status !== "CANCELLED").length,
      upcoming: allSchedules.filter((schedule) => calculateStatus(schedule) === "SCHEDULED").length,
      live: allSchedules.filter((schedule) => calculateStatus(schedule) === "LIVE").length,
      completed: allSchedules.filter((schedule) => calculateStatus(schedule) === "COMPLETED").length,
    }),
    [allSchedules]
  );

  return (
    <div className="space-y-6 lg:space-y-8">
      <SectionHeader
        title="Live Sessions"
        subtitle="Organization-wide and enrolled course sessions in one place"
        showAccent
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(value as "all" | "upcoming" | "live" | "completed")
        }
        className="w-full"
      >
        <TabsList className="mb-6 flex h-11 items-center justify-start gap-2 rounded-lg bg-transparent p-0 w-full border-b border-border/60 shrink-0">
          <PremiumTabsTrigger value="all" icon={Calendar} count={counts.all}>
            All
          </PremiumTabsTrigger>
          <PremiumTabsTrigger
            value="upcoming"
            icon={Calendar}
            count={counts.upcoming}
          >
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

        <TabsContent value={activeTab} className="mt-0">
          <StudentScheduleList
            schedules={filteredSchedules}
            isLoading={isLoading}
            onWatch={(schedule) => {
              const href = schedule.batchId
                ? `/student/batches/${schedule.batchId}/schedule/${schedule.id}`
                : `/student/live-sessions/${schedule.id}`;
              router.push(href);
            }}
            emptyMessage="No live sessions available"
            emptyDescription="New organization-wide and course live sessions will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
