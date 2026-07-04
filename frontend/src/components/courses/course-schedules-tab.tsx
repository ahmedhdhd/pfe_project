"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "@/components/icons";
import { ScheduleList } from "@/components/common/schedule-list";
import { CreateScheduleModal } from "@/components/admin/create-schedule-modal";
import { EditScheduleModal } from "@/components/admin/edit-schedule-modal";
import { useGetSchedulesByBatch, useDeleteSchedule } from "@/hooks";
import { type Schedule } from "@/lib/types/schedule";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";

export interface CourseSchedulesTabProps {
  batchId: string;
  canManageCourse: boolean;
  basePath: "admin" | "teacher";
}

/**
 * Course schedules tab component
 *
 * Displays schedules for a batch with filtering, CRUD operations, and status management
 *
 * @example
 * ```tsx
 * <CourseSchedulesTab
 *   batchId={batchId}
 *   canManageCourse={true}
 * />
 * ```
 */
export function CourseSchedulesTab({
  batchId,
  canManageCourse,
  basePath,
}: CourseSchedulesTabProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [deleteSchedule, setDeleteSchedule] = useState<Schedule | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed">(
    "all"
  );

  const { data: schedulesResponse, isLoading } =
    useGetSchedulesByBatch(batchId);
  const deleteScheduleMutation = useDeleteSchedule();

  const allSchedules: Schedule[] = useMemo(
    () => schedulesResponse?.data || [],
    [schedulesResponse?.data]
  );

  // Filter schedules based on active tab
  const filteredSchedules = useMemo(() => {
    const now = new Date();
    switch (activeTab) {
      case "upcoming":
        return allSchedules.filter(
          (schedule) =>
            new Date(schedule.scheduledAt) > now &&
            schedule.status !== "COMPLETED" &&
            schedule.status !== "CANCELLED"
        );
      case "completed":
        return allSchedules.filter(
          (schedule) =>
            schedule.status === "COMPLETED" ||
            (new Date(schedule.scheduledAt) < now &&
              schedule.status !== "CANCELLED")
        );
      default:
        return allSchedules;
    }
  }, [allSchedules, activeTab]);

  const handleCreateSuccess = () => {
    setIsCreateModalOpen(false);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedSchedule(null);
  };

  const handleDelete = (schedule: Schedule) => {
    setDeleteSchedule(schedule);
  };

  const confirmDelete = async () => {
    if (!deleteSchedule) return;

    try {
      await deleteScheduleMutation.mutateAsync(deleteSchedule.id);
      toast.success("Live session deleted successfully");
      setDeleteSchedule(null);
    } catch (error: unknown) {
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
          : "Failed to delete live session";
      toast.error(errorMessage);
    }
  };

  const handleWatch = (schedule: Schedule) => {
    if (schedule.roomName) {
      router.push(`/${basePath}/courses/${batchId}/schedules/${schedule.id}`);
    }
  };

  return (
    <>
      <Card className="border-border/60 dark:border-border/40">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Live Sessions</CardTitle>
          {canManageCourse && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Live Session</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as "all" | "upcoming" | "completed")
            }
          >
            <TabsList className="mb-4 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">All </span>(
                {allSchedules.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Upcoming </span>(
                {
                  allSchedules.filter(
                    (s) =>
                      new Date(s.scheduledAt) > new Date() &&
                      s.status !== "COMPLETED" &&
                      s.status !== "CANCELLED"
                  ).length
                }
                )
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Completed </span>(
                {
                  allSchedules.filter(
                    (s) =>
                      s.status === "COMPLETED" ||
                      (new Date(s.scheduledAt) < new Date() &&
                        s.status !== "CANCELLED")
                  ).length
                }
                )
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <ScheduleList
                schedules={filteredSchedules}
                isLoading={isLoading}
                canManage={canManageCourse}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onWatch={handleWatch}
                emptyMessage={
                  activeTab === "all"
                    ? "No live sessions added yet"
                    : activeTab === "upcoming"
                    ? "No upcoming live sessions"
                    : "No completed live sessions"
                }
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <CreateScheduleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        batchId={batchId}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Modal */}
      {selectedSchedule && (
        <EditScheduleModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedSchedule(null);
          }}
          schedule={selectedSchedule}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteSchedule}
        onOpenChange={(open) => !open && setDeleteSchedule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Live Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteSchedule?.title}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteScheduleMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
