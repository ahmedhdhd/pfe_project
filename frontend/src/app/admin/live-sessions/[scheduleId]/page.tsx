"use client";

import { useParams } from "next/navigation";
import { LiveSessionRoom } from "@/components/common/live-session-room";

export default function AdminLiveSessionRoomPage() {
  const params = useParams();

  return (
    <LiveSessionRoom
      portal="admin"
      scheduleId={params.scheduleId as string}
      fallbackBackHref="/admin/live-sessions"
      fallbackBackLabel="Back to live sessions"
    />
  );
}
