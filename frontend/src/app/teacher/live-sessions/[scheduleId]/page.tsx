"use client";

import { useParams } from "next/navigation";
import { LiveSessionRoom } from "@/components/common/live-session-room";

export default function TeacherLiveSessionRoomPage() {
  const params = useParams();

  return (
    <LiveSessionRoom
      portal="teacher"
      scheduleId={params.scheduleId as string}
      fallbackBackHref="/teacher/live-sessions"
      fallbackBackLabel="Back to live sessions"
    />
  );
}
