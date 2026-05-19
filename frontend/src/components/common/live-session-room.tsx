"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, Radio, Video, PencilRuler } from "lucide-react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import {
  useGetClientSchedule,
  useGetClientScheduleJoinToken,
  useGetSchedule,
  useGetScheduleJoinToken,
} from "@/hooks";
import type { ScheduleStatus } from "@/lib/types/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveSessionWhiteboard } from "@/components/common/live-session-whiteboard";
import { cn } from "@/lib/utils";

type LiveSessionPortal = "admin" | "teacher" | "student";

interface LiveSessionRoomProps {
  scheduleId: string;
  portal: LiveSessionPortal;
  fallbackBackHref: string;
  fallbackBackLabel: string;
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
};

const getStatusConfig = (status?: ScheduleStatus) => {
  switch (status) {
    case "LIVE":
      return {
        label: "Live now",
        icon: Radio,
        className:
          "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
      };
    case "COMPLETED":
      return {
        label: "Completed",
        icon: Video,
        className:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        icon: Calendar,
        className:
          "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800",
      };
    default:
      return {
        label: "Scheduled",
        icon: Calendar,
        className:
          "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      };
  }
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

export function LiveSessionRoom({
  scheduleId,
  portal,
  fallbackBackHref,
  fallbackBackLabel,
}: LiveSessionRoomProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"session" | "whiteboard">(
    "session"
  );
  const isStudentPortal = portal === "student";

  const scheduleQuery = isStudentPortal
    ? useGetClientSchedule(scheduleId)
    : useGetSchedule(scheduleId);
  const tokenQuery = isStudentPortal
    ? useGetClientScheduleJoinToken(scheduleId, !!scheduleQuery.data)
    : useGetScheduleJoinToken(scheduleId, !!scheduleQuery.data);

  const schedule = scheduleQuery.data ?? tokenQuery.data?.schedule;

  const resolvedBackHref = useMemo(() => {
    if (!schedule) {
      return fallbackBackHref;
    }

    if (portal === "student") {
      return schedule.batchId
        ? `/student/batches/${schedule.batchId}`
        : fallbackBackHref;
    }

    return schedule.batchId
      ? `/${portal}/courses/${schedule.batchId}`
      : fallbackBackHref;
  }, [fallbackBackHref, portal, schedule]);

  const isLoading = scheduleQuery.isLoading || tokenQuery.isLoading;
  const errorMessage =
    getErrorMessage(scheduleQuery.error, "") ||
    getErrorMessage(tokenQuery.error, "Unable to open this live session.");

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (!schedule || !tokenQuery.data) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <h2 className="text-2xl font-semibold">Live session unavailable</h2>
            <p className="text-muted-foreground">
              {errorMessage || "We could not load this session right now."}
            </p>
            <Button onClick={() => router.push(resolvedBackHref)}>
              {fallbackBackLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = tokenQuery.data;
  const statusConfig = getStatusConfig(schedule.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(resolvedBackHref)}
              className="-ml-2 w-fit"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {fallbackBackLabel}
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {schedule.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
                {schedule.description?.trim() ||
                  "This session uses a LiveKit room instead of an external video link."}
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm",
              statusConfig.className
            )}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </Badge>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Schedule
                </p>
                <p className="font-medium">
                  {format(new Date(schedule.scheduledAt), "PPP 'at' p")}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Duration
                </p>
                <p className="font-medium">{formatDuration(schedule.duration)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Video className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Room
                </p>
                <p className="font-medium">{session.roomName}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "session" | "whiteboard")}>
          <TabsList className="mb-4">
            <TabsTrigger value="session">
              <Video className="mr-2 h-4 w-4" />
              Session
            </TabsTrigger>
            <TabsTrigger value="whiteboard">
              <PencilRuler className="mr-2 h-4 w-4" />
              Whiteboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="session" forceMount className="mt-0">
            <Card className="overflow-hidden border-border/60">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base font-medium">
                  {session.canPublish ? "Host controls enabled" : "Student view"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[72vh] min-h-[520px] bg-black">
                  <LiveKitRoom
                    token={session.token}
                    serverUrl={session.serverUrl}
                    connect
                    audio={session.canPublish}
                    video={session.canPublish}
                    className="h-full"
                    data-lk-theme="default"
                  >
                    <VideoConference />
                  </LiveKitRoom>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whiteboard" forceMount className="mt-0">
            <LiveSessionWhiteboard scheduleId={scheduleId} portal={portal} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
