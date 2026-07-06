"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import {
  useGetBatch,
  useDeleteBatch,
  useGetTeachersByBatch,
  useDeleteTeacher,
  useDeleteSubject,
} from "@/hooks";
import { useRolePermissions } from "@/hooks/common";
import { CourseHeader } from "./course-header";
import { CourseCertificateTab } from "./course-certificate-tab";
import { CourseEvaluationsTab } from "./course-evaluations-tab";
import { CourseOverviewTab } from "./course-overview-tab";
import { CourseSubjectsTab } from "./course-subjects-tab";
import { CourseSchedulesTab } from "./course-schedules-tab";
import { CourseTeachersTab } from "./course-teachers-tab";
import { CourseQuestionsTab } from "./course-questions-tab";
import { CourseModals } from "./course-modals";
import {
  Batch,
  Teacher,
  Subject,
  Schedule,
  CourseDetailPageProps,
} from "./types";

export function CourseDetailPage({
  basePath = "admin",
  showSubjectsTab = true,
  showSchedulesTab = true,
  showAnalyticsTab = true,
}: CourseDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.id as string;

  const { isAdmin, isTeacher, canManageTeachers } = useRolePermissions();
  const canManageCourse = isAdmin || isTeacher;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTeacherAssignmentOpen, setIsTeacherAssignmentOpen] = useState(false);
  const [isCreateTeacherOpen, setIsCreateTeacherOpen] = useState(false);
  const [isEditTeacherOpen, setIsEditTeacherOpen] = useState(false);
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState(false);
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteTeacherDialog, setDeleteTeacherDialog] =
    useState<Teacher | null>(null);
  const [deleteSubjectDialog, setDeleteSubjectDialog] =
    useState<Subject | null>(null);

  const { data: batch, isLoading } = useGetBatch(courseId);
  const { data: teachers, isLoading: teachersLoading } =
    useGetTeachersByBatch(courseId);
  const deleteBatchMutation = useDeleteBatch();
  const deleteTeacherMutation = useDeleteTeacher();
  const deleteSubjectMutation = useDeleteSubject();

  const handleGoBack = () => router.push(`/${basePath}/courses`);
  const handleEditCourse = () => setIsEditCourseOpen(true);
  const handleDeleteCourse = () => setIsDeleteDialogOpen(true);
  const confirmDelete = () => {
    deleteBatchMutation.mutate(courseId, {
      onSuccess: () => router.push(`/${basePath}/courses`),
    });
  };

  const handleAssignTeachers = () => setIsTeacherAssignmentOpen(true);
  const handleCreateTeacher = () => setIsCreateTeacherOpen(true);
  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher({
      ...teacher,
      highlights:
        typeof teacher.highlights === "string"
          ? teacher.highlights
          : teacher.highlights?.content || "",
      subjects: teacher.subjects || [],
      batchIds: teacher.batchIds || [],
    });
    setIsEditTeacherOpen(true);
  };

  const handleTeacherCreated = () =>
    queryClient.invalidateQueries({
      queryKey: ["teachers", "batch", courseId],
    });
  const handleTeacherUpdated = () =>
    queryClient.invalidateQueries({
      queryKey: ["teachers", "batch", courseId],
    });
  const handleDeleteTeacher = (teacher: Teacher) => {
    setDeleteTeacherDialog(teacher);
  };

  const confirmDeleteTeacher = () => {
    if (deleteTeacherDialog) {
      deleteTeacherMutation.mutate(deleteTeacherDialog.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["teachers", "batch", courseId],
          });
          setDeleteTeacherDialog(null);
        },
      });
    }
  };

  const handleCreateSubject = () => setIsCreateSubjectOpen(true);
  const handleEditSubject = (subject: Subject) => {
    setSelectedSubject({
      ...subject,
      batchId: subject.batchId || courseId,
    } as Subject);
    setIsEditSubjectOpen(true);
  };
  const handleSubjectCreated = () => {
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["subjects", "batch", courseId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["course-hierarchy", courseId],
      }),
    ]);
  };
  const handleSubjectUpdated = () => {
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["subjects", "batch", courseId],
      }),
      queryClient.invalidateQueries({
        queryKey: ["course-hierarchy", courseId],
      }),
    ]);
  };
  const handleDeleteSubject = (subject: Subject) => {
    setDeleteSubjectDialog(subject);
  };

  const confirmDeleteSubject = () => {
    if (deleteSubjectDialog) {
      deleteSubjectMutation.mutate(deleteSubjectDialog.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ["subjects", "batch", courseId],
          });
          queryClient.invalidateQueries({
            queryKey: ["course-hierarchy", courseId],
          });
          setDeleteSubjectDialog(null);
        },
      });
    }
  };

  const handleCreateSchedule = () => setIsCreateScheduleOpen(true);
  const handleScheduleCreated = () =>
    queryClient.invalidateQueries({
      queryKey: ["schedules", "batch", courseId],
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const courseData = batch?.data as Batch;

  if (!courseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Course not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CourseHeader
        course={courseData}
        canManageCourse={canManageCourse}
        basePath={basePath}
        onGoBack={handleGoBack}
        onEdit={handleEditCourse}
        onDelete={handleDeleteCourse}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList
          className="grid w-full"
          style={{
            gridTemplateColumns: `repeat(${
                [
                  showSubjectsTab,
                  showSchedulesTab,
                  showAnalyticsTab,
                ].filter(Boolean).length + 5
            }, minmax(0, 1fr))`,
          }}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showSubjectsTab && (
            <TabsTrigger value="subjects">Curriculum</TabsTrigger>
          )}
          {showSchedulesTab && (
            <TabsTrigger value="schedules">Live Sessions</TabsTrigger>
          )}
          <TabsTrigger value="certificate">Certificate</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          {showAnalyticsTab && (
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <CourseOverviewTab course={courseData} />
        </TabsContent>

        {showSubjectsTab && (
          <TabsContent value="subjects" className="space-y-6">
            <CourseSubjectsTab
              canManageCourse={canManageCourse}
              courseId={courseId}
              course={courseData}
              basePath={basePath as "admin" | "teacher"}
            />
          </TabsContent>
        )}

        {showSchedulesTab && (
          <TabsContent value="schedules" className="space-y-6">
            <CourseSchedulesTab
              batchId={courseId}
              canManageCourse={canManageCourse}
              basePath={basePath}
            />
          </TabsContent>
        )}

        <TabsContent value="certificate" className="space-y-6">
          <CourseCertificateTab
            courseId={courseId}
            course={courseData}
            canManageCourse={canManageCourse}
          />
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <CourseQuestionsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-6">
          <CourseEvaluationsTab courseId={courseId} />
        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          <CourseTeachersTab
            teachers={(teachers?.data as Teacher[]) || []}
            isLoading={teachersLoading}
            canManageCourse={canManageTeachers}
            onAssignTeachers={handleAssignTeachers}
            onCreateTeacher={handleCreateTeacher}
            onEditTeacher={handleEditTeacher}
            onDeleteTeacher={handleDeleteTeacher}
          />
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Student management coming soon...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {showAnalyticsTab && (
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <CourseModals
        isEditCourseOpen={isEditCourseOpen}
        onEditCourseClose={() => setIsEditCourseOpen(false)}
        course={courseData}
        courseId={courseId}
        onCourseSuccess={() =>
          queryClient.invalidateQueries({ queryKey: ["batch", courseId] })
        }
        isDeleteDialogOpen={isDeleteDialogOpen}
        onDeleteDialogClose={() => setIsDeleteDialogOpen(false)}
        onConfirmDelete={confirmDelete}
        isTeacherAssignmentOpen={isTeacherAssignmentOpen}
        onTeacherAssignmentClose={() => setIsTeacherAssignmentOpen(false)}
        isCreateTeacherOpen={isCreateTeacherOpen}
        onCreateTeacherClose={() => setIsCreateTeacherOpen(false)}
        isEditTeacherOpen={isEditTeacherOpen}
        onEditTeacherClose={() => {
          setIsEditTeacherOpen(false);
          setSelectedTeacher(null);
        }}
        selectedTeacher={selectedTeacher}
        onTeacherCreated={handleTeacherCreated}
        onTeacherUpdated={handleTeacherUpdated}
        showSubjectsTab={showSubjectsTab}
        isCreateSubjectOpen={isCreateSubjectOpen}
        onCreateSubjectClose={() => setIsCreateSubjectOpen(false)}
        isEditSubjectOpen={isEditSubjectOpen}
        onEditSubjectClose={() => {
          setIsEditSubjectOpen(false);
          setSelectedSubject(null);
        }}
        selectedSubject={selectedSubject}
        onSubjectCreated={handleSubjectCreated}
        onSubjectUpdated={handleSubjectUpdated}
        showSchedulesTab={showSchedulesTab}
        isCreateScheduleOpen={isCreateScheduleOpen}
        onCreateScheduleClose={() => setIsCreateScheduleOpen(false)}
        isEditScheduleOpen={isEditScheduleOpen}
        onEditScheduleClose={() => {
          setIsEditScheduleOpen(false);
          setSelectedSchedule(null);
        }}
        selectedSchedule={selectedSchedule}
        onScheduleCreated={handleScheduleCreated}
      />

      {/* Delete Teacher Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteTeacherDialog}
        onOpenChange={(open) => !open && setDeleteTeacherDialog(null)}
        title="Remove Teacher"
        description={`Are you sure you want to remove ${deleteTeacherDialog?.name}? This action cannot be undone.`}
        confirmText="Remove"
        onConfirm={confirmDeleteTeacher}
        variant="destructive"
        isLoading={deleteTeacherMutation.isPending}
      />

      {/* Delete Subject Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteSubjectDialog}
        onOpenChange={(open) => !open && setDeleteSubjectDialog(null)}
        title="Delete Subject"
        description={`Are you sure you want to delete ${deleteSubjectDialog?.name}? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDeleteSubject}
        variant="destructive"
        isLoading={deleteSubjectMutation.isPending}
      />

      <style jsx global>{`
        .dark .course-description div[style],
        .dark .course-description p[style],
        .dark .course-description span[style] {
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
        }
      `}</style>
    </div>
  );
}
