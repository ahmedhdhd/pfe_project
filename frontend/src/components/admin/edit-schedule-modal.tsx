"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Radio } from "@/components/icons";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { FileUpload } from "@/components/common/file-upload";
import { useUpdateSchedule } from "@/hooks";
import { type Schedule, type UpdateScheduleData } from "@/lib/types/schedule";
import Image from "next/image";
import { toast } from "sonner";

export interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: Schedule | null;
  onSuccess: () => void;
}

export function EditScheduleModal({
  isOpen,
  onClose,
  schedule,
  onSuccess,
}: EditScheduleModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduledAt: "",
    scheduledTime: "",
    duration: 60,
    teacherId: "",
    thumbnailUrl: "",
    notifyBeforeMinutes: 30,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const updateSchedule = useUpdateSchedule();

  // Initialize form data when schedule changes
  useEffect(() => {
    if (schedule) {
      const scheduledDate = new Date(schedule.scheduledAt);
      setFormData({
        title: schedule.title,
        description: schedule.description || "",
        scheduledAt: scheduledDate.toISOString(),
        scheduledTime: format(scheduledDate, "HH:mm"),
        duration: schedule.duration,
        teacherId: schedule.teacherId || "",
        thumbnailUrl: schedule.thumbnailUrl || "",
        notifyBeforeMinutes: schedule.notifyBeforeMinutes || 30,
      });
    }
  }, [schedule]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, scheduledAt: date.toISOString() }));
      if (errors.scheduledAt) {
        setErrors((prev) => ({ ...prev, scheduledAt: "" }));
      }
    }
  };

  const handleImageUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    setIsUploadingImage(true);
    try {
      setFormData((prev) => ({ ...prev, thumbnailUrl: fileData.url }));
    } catch (error) {
      console.error("Failed to update thumbnail URL:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.scheduledAt) {
      newErrors.scheduledAt = "Live session date is required";
    }
    if (!formData.scheduledTime) {
      newErrors.scheduledTime = "Live session time is required";
    }
    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = "Duration must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schedule || !validateForm()) {
      return;
    }

    try {
      // Combine date and time
      const scheduledDate = new Date(formData.scheduledAt);
      const [hours, minutes] = formData.scheduledTime.split(":");
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const updateData: UpdateScheduleData = {
        title: formData.title,
        description: formData.description || undefined,
        scheduledAt: scheduledDate.toISOString(),
        duration: formData.duration,
        teacherId: formData.teacherId || undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        notifyBeforeMinutes: formData.notifyBeforeMinutes || undefined,
      };

      await updateSchedule.mutateAsync({
        id: schedule.id,
        data: updateData,
      });
      toast.success("Live session updated successfully");
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error("Failed to update schedule:", error);
      const errorMessage =
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
          ? error.response.data.message
          : "Failed to update live session";
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      scheduledAt: "",
      scheduledTime: "",
      duration: 60,
      teacherId: "",
      thumbnailUrl: "",
      notifyBeforeMinutes: 30,
    });
    setErrors({});
    onClose();
  };

  if (!schedule) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Edit Live Session</DialogTitle>
          <DialogDescription>
            Update the live session details. The LiveKit room
            stays attached automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              This session uses the built-in LiveKit classroom. There is no
              external YouTube link to manage anymore.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Title */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="e.g., Introduction to Calculus"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500 mt-1">{errors.title}</p>
              )}
            </div>

            {/* Live Session Date */}
            <div className="space-y-2">
              <Label>
                Live Session Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.scheduledAt && "text-muted-foreground",
                      errors.scheduledAt && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.scheduledAt ? (
                      format(new Date(formData.scheduledAt), "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={
                      formData.scheduledAt
                        ? new Date(formData.scheduledAt)
                        : undefined
                    }
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.scheduledAt && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.scheduledAt}
                </p>
              )}
            </div>

            {/* Live Session Time */}
            <div className="space-y-2">
              <Label htmlFor="time">
                Live Session Time <span className="text-red-500">*</span>
              </Label>
              <TimePicker
                value={formData.scheduledTime}
                onChange={(time) => handleInputChange("scheduledTime", time)}
                error={!!errors.scheduledTime}
                placeholder="Select time"
              />
              {errors.scheduledTime && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.scheduledTime}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">
                Duration (minutes) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) =>
                  handleInputChange("duration", parseInt(e.target.value))
                }
                placeholder="60"
                className={errors.duration ? "border-red-500" : ""}
              />
              {errors.duration && (
                <p className="text-sm text-red-500 mt-1">{errors.duration}</p>
              )}
            </div>

            {/* Notify Before */}
            <div className="space-y-2">
              <Label htmlFor="notify">Notify Before (minutes)</Label>
              <Input
                id="notify"
                type="number"
                min="0"
                value={formData.notifyBeforeMinutes}
                onChange={(e) =>
                  handleInputChange(
                    "notifyBeforeMinutes",
                    parseInt(e.target.value)
                  )
                }
                placeholder="30"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Add any additional details about this session..."
                rows={4}
              />
            </div>

            {/* Thumbnail Upload */}
            <div className="md:col-span-2 space-y-2">
              <Label>Thumbnail Image (Optional)</Label>
              <FileUpload
                accept="image/*"
                onUploadComplete={handleImageUpload}
                maxSize={5 * 1024 * 1024}
                className="mt-2"
              />
              {formData.thumbnailUrl && (
                <div className="mt-4 relative w-full aspect-video rounded-lg overflow-hidden border">
                  <Image
                    src={formData.thumbnailUrl}
                    alt="Live session thumbnail"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={updateSchedule.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateSchedule.isPending || isUploadingImage}
            >
              {updateSchedule.isPending ? "Updating..." : "Update Live Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
