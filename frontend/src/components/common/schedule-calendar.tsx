"use client";

import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Radio } from "lucide-react";
import type { Schedule, ScheduleStatus } from "@/lib/types/schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScheduleCalendarProps {
  schedules: Schedule[];
  onWatch: (schedule: Schedule) => void;
  emptyMessage?: string;
}

const getScheduleStatus = (schedule: Schedule): ScheduleStatus => {
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

const statusStyles: Record<ScheduleStatus, string> = {
  LIVE: "border-red-300 bg-red-50 text-red-700",
  SCHEDULED: "border-sky-300 bg-sky-50 text-sky-700",
  COMPLETED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-300 bg-slate-50 text-slate-700",
};

export function ScheduleCalendar({
  schedules,
  onWatch,
  emptyMessage = "No live sessions available",
}: ScheduleCalendarProps) {
  const [month, setMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const start = startOfWeek(monthStart, { weekStartsOn: 1 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const sessionsByDay = useMemo(() => {
    return days.map((day) => ({
      day,
      schedules: schedules
        .filter((schedule) => isSameDay(new Date(schedule.scheduledAt), day))
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        ),
    }));
  }, [days, schedules]);

  const visibleCount = useMemo(
    () =>
      schedules.filter((schedule) =>
        isSameMonth(new Date(schedule.scheduledAt), month)
      ).length,
    [month, schedules]
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
        <CardTitle className="text-base font-medium">
          {format(month, "MMMM yyyy")}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {visibleCount} sessions
          </Badge>
          <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {schedules.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <CalendarDays className="h-6 w-6" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            {sessionsByDay.map(({ day, schedules: daySchedules }) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-lg border p-2",
                  isToday(day) ? "border-primary/50 bg-primary/5" : "border-border/70",
                  !isSameMonth(day, month) && "opacity-50"
                )}
              >
                <div className="mb-2 text-sm font-medium">{format(day, "d EEE")}</div>
                <div className="space-y-2">
                  {daySchedules.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No sessions</div>
                  ) : (
                    daySchedules.map((schedule) => {
                      const status = getScheduleStatus(schedule);
                      return (
                        <button
                          key={schedule.id}
                          type="button"
                          onClick={() => onWatch(schedule)}
                          className={cn(
                            "w-full rounded-md border p-2 text-left text-xs transition hover:shadow-sm",
                            statusStyles[status]
                          )}
                        >
                          <div className="mb-1 line-clamp-2 font-medium">{schedule.title}</div>
                          <div className="flex items-center gap-1">
                            {status === "LIVE" ? (
                              <Radio className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {format(new Date(schedule.scheduledAt), "p")}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

