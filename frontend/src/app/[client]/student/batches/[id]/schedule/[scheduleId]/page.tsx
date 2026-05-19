"use client";

import { useParams } from "next/navigation";
import { LiveSessionRoom } from "@/components/common/live-session-room";

export default function SchedulePlayerPage() {
  const params = useParams();

  return (
    <LiveSessionRoom
      portal="student"
      scheduleId={params.scheduleId as string}
      fallbackBackHref={`/student/batches/${params.id as string}`}
      fallbackBackLabel="Back to course"
    />
  );
}
