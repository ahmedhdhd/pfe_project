"use client";

import { useParams } from "next/navigation";
import { LiveSessionRoom } from "@/components/common/live-session-room";

export default function AdminScheduleRoomPage() {
  const params = useParams();

  return (
    <LiveSessionRoom
      portal="admin"
      scheduleId={params.scheduleId as string}
      fallbackBackHref={`/admin/courses/${params.id as string}`}
      fallbackBackLabel="Back to course"
    />
  );
}
