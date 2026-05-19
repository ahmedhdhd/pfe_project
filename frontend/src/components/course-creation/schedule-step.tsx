"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Schedule {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  date?: string;
  isRecurring: boolean;
}

interface ScheduleStepProps {
  data: {
    schedules: Array<{
      id: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      date?: string;
      isRecurring: boolean;
    }>;
  };
  onUpdate: (data: Record<string, unknown>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = [
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
];

export function ScheduleStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isLastStep,
  isSubmitting,
  onSubmit,
}: ScheduleStepProps) {
  const [schedules, setSchedules] = useState<Schedule[]>(data.schedules || []);
  const [newSchedule, setNewSchedule] = useState<Partial<Schedule>>({
    dayOfWeek: "",
    startTime: "",
    endTime: "",
    isRecurring: true,
  });

  const handleAddSchedule = () => {
    if (
      newSchedule.dayOfWeek &&
      newSchedule.startTime &&
      newSchedule.endTime &&
      (newSchedule.isRecurring || newSchedule.date)
    ) {
      const schedule: Schedule = {
        id: Date.now().toString(),
        dayOfWeek: newSchedule.dayOfWeek,
        startTime: newSchedule.startTime,
        endTime: newSchedule.endTime,
        isRecurring: newSchedule.isRecurring || true,
        date: newSchedule.date,
      };

      setSchedules([...schedules, schedule]);
      onUpdate({ ...data, schedules: [...schedules, schedule] });

      // Reset form
      setNewSchedule({
        dayOfWeek: "",
        startTime: "",
        endTime: "",
        isRecurring: true,
      });
    }
  };

  const handleRemoveSchedule = (id: string) => {
    const updatedSchedules = schedules.filter((s) => s.id !== id);
    setSchedules(updatedSchedules);
    onUpdate({ ...data, schedules: updatedSchedules });
  };

  const handleNext = () => {
    if (schedules.length > 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Course Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set up class timings and recurring schedules for your course
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New Schedule */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Add Schedule</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select
                  value={newSchedule.dayOfWeek}
                  onValueChange={(value) =>
                    setNewSchedule({ ...newSchedule, dayOfWeek: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Select
                  value={newSchedule.startTime}
                  onValueChange={(value) =>
                    setNewSchedule({ ...newSchedule, startTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Start time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Select
                  value={newSchedule.endTime}
                  onValueChange={(value) =>
                    setNewSchedule({ ...newSchedule, endTime: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="End time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Schedule Type</Label>
                <Select
                  value={newSchedule.isRecurring ? "recurring" : "one-time"}
                  onValueChange={(value) =>
                    setNewSchedule({
                      ...newSchedule,
                      isRecurring: value === "recurring",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!newSchedule.isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="specificDate">Specific Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newSchedule.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newSchedule.date
                        ? format(new Date(newSchedule.date), "PPP")
                        : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={
                        newSchedule.date
                          ? new Date(newSchedule.date)
                          : undefined
                      }
                      onSelect={(date) =>
                        setNewSchedule({
                          ...newSchedule,
                          date: date ? format(date, "yyyy-MM-dd") : "",
                        })
                      }
                      captionLayout="dropdown"
                      fromDate={new Date()}
                      toDate={new Date(2030, 11, 31)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Button onClick={handleAddSchedule} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </div>

          {/* Schedule List */}
          {schedules.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Current Schedules</h4>
              <div className="space-y-2">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {schedule.dayOfWeek}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                      {schedule.isRecurring ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Recurring
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {schedule.date
                            ? format(new Date(schedule.date), "MMM dd, yyyy")
                            : "One-time"}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {schedules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schedules added yet</p>
              <p className="text-sm">Add your first schedule to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={isFirstStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <Button
          onClick={isLastStep ? onSubmit : handleNext}
          disabled={isSubmitting || schedules.length === 0}
        >
          {isLastStep ? (
            isSubmitting ? (
              "Creating Course..."
            ) : (
              "Create Course"
            )
          ) : (
            <>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
