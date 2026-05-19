"use client";

import { TeacherAssignmentModal } from "@/components/common/teacher-assignment-modal";
import { CreateTeacherModal } from "@/components/common/create-teacher-modal";
import { EditTeacherModal } from "@/components/common/edit-teacher-modal";
import { CreateSubjectModal } from "@/components/common/create-subject-modal";
import { EditSubjectModal } from "@/components/common/edit-subject-modal";
import { CreateScheduleModal } from "@/components/common/create-schedule-modal";
import { EditScheduleModal } from "@/components/common/edit-schedule-modal";
import { EditBatchModal } from "@/components/common/edit-batch-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Batch, Teacher, Subject, Schedule } from "./types";

interface CourseModalsProps {
  // Batch/Course modals
  isEditCourseOpen: boolean;
  onEditCourseClose: () => void;
  course: Batch;
  courseId: string;
  onCourseSuccess: () => void;

  // Delete modal
  isDeleteDialogOpen: boolean;
  onDeleteDialogClose: () => void;
  onConfirmDelete: () => void;

  // Teacher modals
  isTeacherAssignmentOpen: boolean;
  onTeacherAssignmentClose: () => void;
  isCreateTeacherOpen: boolean;
  onCreateTeacherClose: () => void;
  isEditTeacherOpen: boolean;
  onEditTeacherClose: () => void;
  selectedTeacher: Teacher | null;
  onTeacherCreated: () => void;
  onTeacherUpdated: () => void;

  // Subject modals
  showSubjectsTab: boolean;
  isCreateSubjectOpen: boolean;
  onCreateSubjectClose: () => void;
  isEditSubjectOpen: boolean;
  onEditSubjectClose: () => void;
  selectedSubject: Subject | null;
  onSubjectCreated: () => void;
  onSubjectUpdated: () => void;

  // Schedule modals
  showSchedulesTab: boolean;
  isCreateScheduleOpen: boolean;
  onCreateScheduleClose: () => void;
  isEditScheduleOpen: boolean;
  onEditScheduleClose: () => void;
  selectedSchedule: Schedule | null;
  onScheduleCreated: () => void;
}

export function CourseModals({
  isEditCourseOpen,
  onEditCourseClose,
  course,
  courseId,
  onCourseSuccess,
  isDeleteDialogOpen,
  onDeleteDialogClose,
  onConfirmDelete,
  isTeacherAssignmentOpen,
  onTeacherAssignmentClose,
  isCreateTeacherOpen,
  onCreateTeacherClose,
  isEditTeacherOpen,
  onEditTeacherClose,
  selectedTeacher,
  onTeacherCreated,
  onTeacherUpdated,
  showSubjectsTab,
  isCreateSubjectOpen,
  onCreateSubjectClose,
  isEditSubjectOpen,
  onEditSubjectClose,
  selectedSubject,
  onSubjectCreated,
  onSubjectUpdated,
  showSchedulesTab,
  isCreateScheduleOpen,
  onCreateScheduleClose,
  isEditScheduleOpen,
  onEditScheduleClose,
  selectedSchedule,
  onScheduleCreated,
}: CourseModalsProps) {
  return (
    <>
      {/* Edit Course Modal */}
      <EditBatchModal
        isOpen={isEditCourseOpen}
        onClose={onEditCourseClose}
        batch={course}
        onSuccess={onCourseSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this course? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onDeleteDialogClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Modals */}
      <TeacherAssignmentModal
        isOpen={isTeacherAssignmentOpen}
        onClose={onTeacherAssignmentClose}
        batchId={courseId}
        batchName={course.name}
      />

      <CreateTeacherModal
        isOpen={isCreateTeacherOpen}
        onClose={onCreateTeacherClose}
        batchId={courseId}
        onSuccess={onTeacherCreated}
      />

      <EditTeacherModal
        isOpen={isEditTeacherOpen}
        onClose={onEditTeacherClose}
        teacher={selectedTeacher}
        onSuccess={onTeacherUpdated}
      />

      {/* Subject Modals */}
      {showSubjectsTab && (
        <>
          <CreateSubjectModal
            isOpen={isCreateSubjectOpen}
            onClose={onCreateSubjectClose}
            batchId={courseId}
            onSuccess={onSubjectCreated}
          />

          <EditSubjectModal
            isOpen={isEditSubjectOpen}
            onClose={onEditSubjectClose}
            subject={selectedSubject}
            onSuccess={onSubjectUpdated}
          />
        </>
      )}

      {/* Schedule Modals */}
      {showSchedulesTab && (
        <>
          <CreateScheduleModal
            isOpen={isCreateScheduleOpen}
            onClose={onCreateScheduleClose}
            batchId={courseId}
            onSuccess={onScheduleCreated}
          />

          <EditScheduleModal
            isOpen={isEditScheduleOpen}
            onClose={onEditScheduleClose}
            schedule={selectedSchedule}
            onSuccess={onScheduleCreated}
          />
        </>
      )}
    </>
  );
}
