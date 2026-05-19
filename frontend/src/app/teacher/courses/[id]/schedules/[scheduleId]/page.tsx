"use client";

import { useParams } from "next/navigation";
import { LiveSessionRoom } from "@/components/common/live-session-room";

export default function TeacherScheduleRoomPage() {
  const params = useParams();

  return (
    <LiveSessionRoom
      portal="teacher"
      scheduleId={params.scheduleId as string}
      fallbackBackHref={`/teacher/courses/${params.id as string}`}
      fallbackBackLabel="Back to course"
    />
  );
}
