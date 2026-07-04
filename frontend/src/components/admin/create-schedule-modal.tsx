"use client";

import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon } from "@/components/icons";
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
import {
  useCreateSchedule,
  useGetAllBatches,
} from "@/hooks";
import { type CreateScheduleData } from "@/lib/types/schedule";
import Image from "next/image";
import { toast } from "sonner";

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId?: string;
  onSuccess: () => void;
}

export function CreateScheduleModal({
  isOpen,
  onClose,
  batchId,
  onSuccess,
}: CreateScheduleModalProps) {
  const [formData, setFormData] = useState({
    audienceType: batchId ? "COURSE" : "ORGANIZATION",
    batchId: batchId || "",
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

  const { data: batchesData } = useGetAllBatches();
  const effectiveBatchId =
    formData.audienceType === "COURSE" ? formData.batchId || batchId || "" : "";
  const createSchedule = useCreateSchedule();

  const batches = useMemo(
    () =>
      ((batchesData?.data as Array<{ id: string; name: string }> | undefined) ??
        []),
    [batchesData?.data]
  );

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
    if (formData.audienceType === "COURSE") {
      if (!effectiveBatchId) {
        newErrors.batchId = "Course is required";
      }
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

    if (!validateForm()) {
      return;
    }

    try {
      // Combine date and time
      const scheduledDate = new Date(formData.scheduledAt);
      const [hours, minutes] = formData.scheduledTime.split(":");
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Build schedule data object, only including fields with values
      const scheduleData: CreateScheduleData = {
        audienceType:
          batchId || formData.audienceType === "COURSE"
            ? "COURSE"
            : "ORGANIZATION",
        title: formData.title,
        scheduledAt: scheduledDate.toISOString(),
        duration: formData.duration,
      };

      if (batchId || formData.audienceType === "COURSE") {
        scheduleData.batchId = effectiveBatchId;
      }
      if (formData.description && formData.description.trim()) {
        scheduleData.description = formData.description.trim();
      }
      if (formData.teacherId && formData.teacherId.trim()) {
        scheduleData.teacherId = formData.teacherId.trim();
      }
      if (formData.thumbnailUrl && formData.thumbnailUrl.trim()) {
        scheduleData.thumbnailUrl = formData.thumbnailUrl.trim();
      }
      if (formData.notifyBeforeMinutes) {
        scheduleData.notifyBeforeMinutes = formData.notifyBeforeMinutes;
      }

      await createSchedule.mutateAsync(scheduleData);
      toast.success("Live session created successfully");
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      console.error("Failed to create schedule:", error);
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
          : "Failed to create live session";
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    setFormData({
      audienceType: batchId ? "COURSE" : "ORGANIZATION",
      batchId: batchId || "",
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Create Live Session</DialogTitle>
          <DialogDescription>
            Create a new LiveKit session for a course or for the whole
            organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {!batchId ? (
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={formData.audienceType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      audienceType: value,
                      ...(value === "ORGANIZATION"
                        ? {
                            batchId: batchId || "",
                          }
                        : {}),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORGANIZATION">
                      All organization students
                    </SelectItem>
                    <SelectItem value="COURSE">Students in a course</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Audience</Label>
                <Input value="Students in this course" readOnly />
              </div>
            )}

            {formData.audienceType === "COURSE" && !batchId ? (
              <div className="space-y-2">
                <Label>
                  Course <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.batchId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      batchId: value,
                    }))
                  }
                >
                  <SelectTrigger
                    className={errors.batchId ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.batchId && (
                  <p className="text-sm text-red-500 mt-1">{errors.batchId}</p>
                )}
              </div>
            ) : null}

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
              disabled={createSchedule.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSchedule.isPending || isUploadingImage}
            >
              {createSchedule.isPending ? "Creating..." : "Create Live Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
