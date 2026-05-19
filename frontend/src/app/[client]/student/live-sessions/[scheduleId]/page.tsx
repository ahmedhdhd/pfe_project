"use client";

import { useParams } from "next/navigation";
import { LiveSessionRoom } from "@/components/common/live-session-room";

export default function StudentGlobalLiveSessionPage() {
  const params = useParams();

  return (
    <LiveSessionRoom
      portal="student"
      scheduleId={params.scheduleId as string}
      fallbackBackHref="/student/live-sessions"
      fallbackBackLabel="Back to live sessions"
    />
  );
}
