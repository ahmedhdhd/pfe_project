"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, Radio, Video, PencilRuler } from "@/components/icons";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import {
  useGetClientSchedule,
  useGetClientScheduleAiSummary,
  useGetClientScheduleJoinToken,
  useMarkClientScheduleAttendance,
  useGetSchedule,
  useGetScheduleAttendance,
  useGetScheduleAiSummary,
  useGetScheduleJoinToken,
  useUploadScheduleTranscriptChunk,
  useUpdateScheduleStatus,
} from "@/hooks";
import type { ScheduleStatus } from "@/lib/types/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveSessionWhiteboard } from "@/components/common/live-session-whiteboard";
import { cn } from "@/lib/utils";
import { formatScheduleAiSummaryDisplay } from "@/lib/schedule-summary";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [activeTab, setActiveTab] = useState<
    "session" | "whiteboard" | "attendance"
  >(
    "session"
  );
  const isStudentPortal = portal === "student";
  const [attendanceConnected, setAttendanceConnected] = useState(false);
  const [roomShouldConnect, setRoomShouldConnect] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recorderMimeTypeRef = useRef("audio/webm");
  const pendingTranscriptUploadsRef = useRef<Array<Promise<unknown>>>([]);
  const lastTranscriptUploadRef = useRef<Promise<unknown>>(Promise.resolve());

  const scheduleQuery = isStudentPortal
    ? useGetClientSchedule(scheduleId)
    : useGetSchedule(scheduleId);
  const tokenQuery = isStudentPortal
    ? useGetClientScheduleJoinToken(scheduleId, !!scheduleQuery.data)
    : useGetScheduleJoinToken(scheduleId, !!scheduleQuery.data);

  const schedule = scheduleQuery.data ?? tokenQuery.data?.schedule;
  const attendanceQuery = useGetScheduleAttendance(
    scheduleId,
    !isStudentPortal && !!schedule
  );
  const attendanceMutation = useMarkClientScheduleAttendance();
  const transcriptChunkMutation = useUploadScheduleTranscriptChunk();
  const updateScheduleStatusMutation = useUpdateScheduleStatus();
  const summaryQuery = isStudentPortal
    ? useGetClientScheduleAiSummary(scheduleId, !!schedule)
    : useGetScheduleAiSummary(scheduleId, !!schedule);

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

  const session = tokenQuery.data;
  const statusConfig = getStatusConfig(schedule?.status);
  const StatusIcon = statusConfig.icon;
  const attendanceRows = attendanceQuery.data?.data ?? [];
  const attendanceSummary = attendanceQuery.data?.summary;
  const aiSummary = summaryQuery.data;
  const summaryDisplay = formatScheduleAiSummaryDisplay(aiSummary?.aiSummary, {
    summaryStatus: aiSummary?.summaryStatus,
    summaryError: aiSummary?.summaryError,
  });
  const summaryStillPending =
    schedule?.status === "COMPLETED" &&
    (aiSummary?.summaryStatus === "PENDING" ||
      (!aiSummary?.summaryGeneratedAt &&
        aiSummary?.summaryStatus !== "FAILED" &&
        aiSummary?.summaryStatus !== "READY"));

  const markAttendance = async (action: "join" | "leave") => {
    if (!isStudentPortal || attendanceMutation.isPending) return;
    try {
      await attendanceMutation.mutateAsync({ id: scheduleId, action });
    } catch {
      // No-op: avoid interrupting the live session experience.
    }
  };

  const buildRecordingBlob = () => {
    if (recordedChunksRef.current.length === 0) {
      return null;
    }
    return new Blob(recordedChunksRef.current, {
      type: recorderMimeTypeRef.current,
    });
  };

  const queueTranscriptUpload = (blob: Blob, options?: { replace?: boolean }) => {
    if (!session?.canPublish || blob.size === 0) {
      return Promise.resolve();
    }

    const uploadPromise = lastTranscriptUploadRef.current
      .finally(() =>
        transcriptChunkMutation.mutateAsync({
          id: scheduleId,
          file: blob,
          replace: options?.replace ?? false,
        })
      )
      .catch((error: unknown) => {
        console.warn("[live-session] Transcript chunk upload failed:", error);
      });

    lastTranscriptUploadRef.current = uploadPromise;

    pendingTranscriptUploadsRef.current.push(uploadPromise);
    uploadPromise.finally(() => {
      pendingTranscriptUploadsRef.current =
        pendingTranscriptUploadsRef.current.filter((entry) => entry !== uploadPromise);
    });

    return uploadPromise;
  };

  const cleanupTranscriptCapture = () => {
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startTranscriptCapture = async () => {
    if (
      !session?.canPublish ||
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      mediaRecorderRef.current
    ) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recorderMimeTypeRef.current = recorder.mimeType || "audio/webm";

      recorder.ondataavailable = (event) => {
        if (event.data.size === 0) {
          return;
        }
        recordedChunksRef.current.push(event.data);
        const recording = buildRecordingBlob();
        if (recording) {
          // Timeslice blobs are often invalid alone; upload one merged WebM each interval.
          void queueTranscriptUpload(recording, { replace: true });
        }
      };

      recorder.start(30_000);
    } catch {
      cleanupTranscriptCapture();
    }
  };

  const stopTranscriptCapture = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      cleanupTranscriptCapture();
      await Promise.all([...pendingTranscriptUploadsRef.current]);
      return;
    }

    if (recorder.state === "inactive") {
      cleanupTranscriptCapture();
      await Promise.all([...pendingTranscriptUploadsRef.current]);
      return;
    }

    await new Promise<void>((resolve) => {
      recorder.addEventListener(
        "stop",
        () => {
          // Some browsers enqueue the final dataavailable upload after the stop event.
          window.setTimeout(() => {
            Promise.all([...pendingTranscriptUploadsRef.current]).finally(() => {
              cleanupTranscriptCapture();
              resolve();
            });
          }, 500);
        },
        { once: true }
      );
      recorder.stop();
    });
  };

  useEffect(() => {
    return () => {
      void stopTranscriptCapture();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (!schedule) {
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

  const isCompletedSession = schedule.status === "COMPLETED";

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
                <p className="font-medium">{session?.roomName ?? schedule.roomName}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {schedule.status === "COMPLETED" && (
          <Card className="mb-6 border-border/60">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-medium">
                AI Live Session Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {summaryQuery.isLoading || summaryStillPending ? (
                <p className="text-sm text-muted-foreground">
                  Generating summary from the uploaded transcript chunks. This can take a few minutes after the host ends the session.
                </p>
              ) : summaryDisplay.text ? (
                <>
                  <div
                    className={cn(
                      "prose prose-sm max-w-none break-words text-sm leading-relaxed",
                      "prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold",
                      "prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1",
                      "prose-strong:font-semibold",
                      summaryDisplay.isError && "text-destructive"
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {summaryDisplay.text}
                    </ReactMarkdown>
                  </div>
                  {aiSummary?.summaryGeneratedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Generated on{" "}
                      {format(new Date(aiSummary.summaryGeneratedAt), "PPP p")}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Summary is not available yet. Join and end the session as host (allow microphone access) so transcript chunks can upload. Configure GROQ_API_KEY and ffmpeg in ai-service, and OpenRouter for your organization.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isCompletedSession ? (
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-medium">
                Live Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Session title</p>
                  <p className="font-medium">{schedule.title}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Scheduled at</p>
                  <p className="font-medium">
                    {format(new Date(schedule.scheduledAt), "PPP p")}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(schedule.duration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "session" | "whiteboard" | "attendance")
            }
          >
            <TabsList className="mb-4">
              <TabsTrigger value="session">
                <Video className="mr-2 h-4 w-4" />
                Session
              </TabsTrigger>
              <TabsTrigger value="whiteboard">
                <PencilRuler className="mr-2 h-4 w-4" />
                Whiteboard
              </TabsTrigger>
              {!isStudentPortal && (
                <TabsTrigger value="attendance">
                  <Clock className="mr-2 h-4 w-4" />
                  Attendance
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="session" forceMount className="mt-0">
              <Card className="overflow-hidden border-border/60">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <CardTitle className="text-base font-medium">
                    {session
                      ? session.canPublish
                        ? "Host controls enabled"
                        : "Student view"
                      : "Student view"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[72vh] min-h-[520px] bg-black">
                    {session ? (
                      <LiveKitRoom
                      token={session.token}
                      serverUrl={session.serverUrl}
                      connect={roomShouldConnect}
                      audio={session.canPublish}
                      video={session.canPublish}
                      className="h-full"
                      data-lk-theme="default"
                      onConnected={() => {
                        if (session.canPublish) {
                          if (schedule.status !== "LIVE") {
                            void updateScheduleStatusMutation.mutateAsync({
                              id: scheduleId,
                              status: { status: "LIVE" },
                            });
                          }
                          void startTranscriptCapture();
                        }
                        if (isStudentPortal && !attendanceConnected) {
                          setAttendanceConnected(true);
                          void markAttendance("join");
                        }
                      }}
                      onDisconnected={() => {
                        if (session.canPublish) {
                          setRoomShouldConnect(false);
                          void (async () => {
                            await stopTranscriptCapture();
                            await updateScheduleStatusMutation.mutateAsync({
                              id: scheduleId,
                              status: { status: "COMPLETED" },
                            });
                          })();
                          return;
                        }
                        if (isStudentPortal && attendanceConnected) {
                          setAttendanceConnected(false);
                          void markAttendance("leave");
                        }
                      }}
                      >
                        <VideoConference />
                      </LiveKitRoom>
                    ) : (
                      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground bg-background">
                        {errorMessage || "This live session has ended and is no longer accessible."}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whiteboard" forceMount className="mt-0">
              <LiveSessionWhiteboard scheduleId={scheduleId} portal={portal} />
            </TabsContent>

            {!isStudentPortal && (
              <TabsContent value="attendance" forceMount className="mt-0">
                <Card className="overflow-hidden border-border/60">
                  <CardHeader className="border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-base font-medium">
                      Session attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {attendanceSummary ? (
                      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Participants</p>
                          <p className="text-xl font-semibold">{attendanceSummary.participants}</p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Present now</p>
                          <p className="text-xl font-semibold">{attendanceSummary.presentNow}</p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Streaming duration</p>
                          <p className="text-xl font-semibold">{attendanceSummary.streamingDurationMins} min</p>
                        </div>
                        <div className="rounded-md border p-3">
                          <p className="text-xs text-muted-foreground">Avg attendance</p>
                          <p className="text-xl font-semibold">{attendanceSummary.averageAttendanceMins} min</p>
                        </div>
                      </div>
                    ) : null}
                    {attendanceSummary?.streamStartedAt ? (
                      <p className="mb-3 text-xs text-muted-foreground">
                        Stream window: {format(new Date(attendanceSummary.streamStartedAt), "PPP p")}
                        {" - "}
                        {attendanceSummary.streamEndedAt
                          ? format(new Date(attendanceSummary.streamEndedAt), "PPP p")
                          : "ongoing"}
                      </p>
                    ) : null}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Joined At</TableHead>
                          <TableHead>Left At</TableHead>
                          <TableHead>Duration (mins)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No attendance records yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          attendanceRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.user.username}</TableCell>
                              <TableCell>{row.user.email ?? "-"}</TableCell>
                              <TableCell>{format(new Date(row.joinedAt), "PPP p")}</TableCell>
                              <TableCell>{row.leftAt ? format(new Date(row.leftAt), "PPP p") : "-"}</TableCell>
                              <TableCell>{row.durationMins}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}

        {isCompletedSession && !isStudentPortal && (
          <Card className="mt-6 overflow-hidden border-border/60">
            <CardHeader className="border-b border-border/60 bg-muted/20">
              <CardTitle className="text-base font-medium">
                Session attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {attendanceSummary ? (
                <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Participants</p>
                    <p className="text-xl font-semibold">{attendanceSummary.participants}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Present now</p>
                    <p className="text-xl font-semibold">{attendanceSummary.presentNow}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Streaming duration</p>
                    <p className="text-xl font-semibold">{attendanceSummary.streamingDurationMins} min</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Avg attendance</p>
                    <p className="text-xl font-semibold">{attendanceSummary.averageAttendanceMins} min</p>
                  </div>
                </div>
              ) : null}
              {attendanceSummary?.streamStartedAt ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  Stream window: {format(new Date(attendanceSummary.streamStartedAt), "PPP p")}
                  {" - "}
                  {attendanceSummary.streamEndedAt
                    ? format(new Date(attendanceSummary.streamEndedAt), "PPP p")
                    : "ongoing"}
                </p>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined At</TableHead>
                    <TableHead>Left At</TableHead>
                    <TableHead>Duration (mins)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No attendance records yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendanceRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.user.username}</TableCell>
                        <TableCell>{row.user.email ?? "-"}</TableCell>
                        <TableCell>{format(new Date(row.joinedAt), "PPP p")}</TableCell>
                        <TableCell>{row.leftAt ? format(new Date(row.leftAt), "PPP p") : "-"}</TableCell>
                        <TableCell>{row.durationMins}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
