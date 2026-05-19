"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CreateScheduleModal } from "@/components/common/create-schedule-modal";
import { EditScheduleModal } from "@/components/common/edit-schedule-modal";
import { PageHeader } from "@/components/common/page-header";
import { ScheduleList } from "@/components/common/schedule-list";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteSchedule, useGetSchedules } from "@/hooks";
import type { Schedule } from "@/lib/types/schedule";

interface ScheduleManagementPageProps {
  portal: "admin" | "teacher";
}

export function ScheduleManagementPage({
  portal,
}: ScheduleManagementPageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed">(
    "all"
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [deleteSchedule, setDeleteSchedule] = useState<Schedule | null>(null);

  const { data: schedulesResponse, isLoading } = useGetSchedules();
  const deleteScheduleMutation = useDeleteSchedule();
  const allSchedules = useMemo(
    () => schedulesResponse?.data || [],
    [schedulesResponse?.data]
  );

  const filteredSchedules = useMemo(() => {
    const now = new Date();

    if (activeTab === "upcoming") {
      return allSchedules.filter(
        (schedule) =>
          new Date(schedule.scheduledAt) > now &&
          schedule.status !== "COMPLETED" &&
          schedule.status !== "CANCELLED"
      );
    }

    if (activeTab === "completed") {
      return allSchedules.filter(
        (schedule) =>
          schedule.status === "COMPLETED" ||
          (new Date(schedule.scheduledAt) < now &&
            schedule.status !== "CANCELLED")
      );
    }

    return allSchedules;
  }, [activeTab, allSchedules]);

  const handleWatch = (schedule: Schedule) => {
    const href = schedule.batchId
      ? `/${portal}/courses/${schedule.batchId}/schedules/${schedule.id}`
      : `/${portal}/live-sessions/${schedule.id}`;
    router.push(href);
  };

  const confirmDelete = async () => {
    if (!deleteSchedule) {
      return;
    }

    try {
      await deleteScheduleMutation.mutateAsync(deleteSchedule.id);
      toast.success("Live session deleted successfully");
      setDeleteSchedule(null);
    } catch (error: unknown) {
      const message =
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
      toast.error(message);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Live Sessions"
          description="Create course-based or organization-wide LiveKit sessions from one place."
          actions={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Live Session
            </Button>
          }
        />

        <Card className="border-border/60">
          <CardContent className="p-6">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "all" | "upcoming" | "completed")
              }
            >
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              <TabsContent value={activeTab} className="mt-0">
                <ScheduleList
                  schedules={filteredSchedules}
                  isLoading={isLoading}
                  canManage
                  onEdit={(schedule) => {
                    setSelectedSchedule(schedule);
                    setIsEditModalOpen(true);
                  }}
                  onDelete={setDeleteSchedule}
                  onWatch={handleWatch}
                  emptyMessage={
                    activeTab === "all"
                      ? "No live sessions yet"
                      : activeTab === "upcoming"
                      ? "No upcoming live sessions"
                      : "No completed live sessions"
                  }
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <CreateScheduleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setIsCreateModalOpen(false)}
      />

      {selectedSchedule ? (
        <EditScheduleModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedSchedule(null);
          }}
          schedule={selectedSchedule}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setSelectedSchedule(null);
          }}
        />
      ) : null}

      <AlertDialog
        open={!!deleteSchedule}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSchedule(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete live session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSchedule?.title}"? This
              action cannot be undone.
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
