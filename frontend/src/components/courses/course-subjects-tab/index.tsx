"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlayCircle, Trash2 } from "@/components/icons";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { CreateChapterModal } from "@/components/admin/create-chapter-modal";
import { CreateContentModal } from "@/components/admin/create-content-modal";
import { CreateTopicModal } from "@/components/admin/create-topic-modal";
import { DetailedHLSUpload } from "@/components/common/detailed-hls-upload";
import { EditTopicQuizModal } from "@/components/admin/edit-topic-quiz-modal";
import { ContentType } from "@/components/common/content-form";
import { EditChapterModal } from "@/components/admin/edit-chapter-modal";
import { EditContentModal } from "@/components/admin/edit-content-modal";
import { EditTopicModal } from "@/components/admin/edit-topic-modal";
import { UnifiedVideoPlayer } from "@/components/common/unified-video-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useDeleteChapter,
  useDeleteContent,
  useDeleteTopicQuiz,
  useDeleteTopic,
  useGetCourseOutline,
  useGetSubjectsByBatch,
  useGetBatchPlaygrounds,
} from "@/hooks";
import { getVideoMimeType } from "@/components/student/course/utils";
import apiClient from "@/lib/api/client";
import type { Batch } from "../types";
import { ChapterOnlyBuilder } from "./chapter-builder";
import {
  findPlaygroundForScope,
  getChapterOutlineCounts,
  getContentName,
  getDefaultOutlineSelection,
  isOutlineSelectionValid,
  findOutlineSelectionNodes,
} from "./helpers";
import type {
  DeleteTarget,
  HierarchyChapter,
  HierarchyContent,
  HierarchySubject,
  HierarchyTopic,
  Selection,
} from "./types";

interface CourseSubjectsTabProps {
  canManageCourse: boolean;
  courseId: string;
  course?: Batch | null;
  basePath?: "admin" | "teacher";
}

export function CourseSubjectsTab({
  canManageCourse,
  courseId,
  course,
  basePath = "admin",
}: CourseSubjectsTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null
  );
  const [createChapterSubjectId, setCreateChapterSubjectId] = useState<
    string | null
  >(null);
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);
  const [editChapter, setEditChapter] = useState<HierarchyChapter | null>(null);
  const [createTopicChapter, setCreateTopicChapter] =
    useState<HierarchyChapter | null>(null);
  const [editTopic, setEditTopic] = useState<HierarchyTopic | null>(null);
  const [createContentTopic, setCreateContentTopic] =
    useState<HierarchyTopic | null>(null);
  const [editContent, setEditContent] = useState<HierarchyContent | null>(null);
  const [editTopicQuizTopic, setEditTopicQuizTopic] =
    useState<HierarchyTopic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const { data, isLoading, isFetching } = useGetCourseOutline(courseId);
  const { data: subjectsResponse } = useGetSubjectsByBatch(courseId);
  const { data: batchPlaygrounds = [] } = useGetBatchPlaygrounds(
    courseId,
    canManageCourse
  );
  const updateIntroVideoMutation = useMutation({
    mutationFn: (introVideoUrl?: string) =>
      apiClient
        .put(`/admin/batches/${courseId}`, {
          name: course?.name || "",
          description: course?.description || "",
          categoryId: course?.category?.id || course?.categoryId || undefined,
          imageUrl: course?.imageUrl || undefined,
          introVideoUrl: typeof introVideoUrl === "string" ? introVideoUrl : "",
          introVideoType: undefined,
          startDate: course?.startDate || new Date().toISOString(),
          endDate: course?.endDate || new Date().toISOString(),
          language: course?.language || "English",
          level: course?.level || "BEGINNER",
          totalPrice: course?.totalPrice || 0,
          discountPercentage: course?.discountPercentage || 0,
          faq: course?.faq || [],
          teacherId: course?.teacherId,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch", courseId] });
      queryClient.invalidateQueries({ queryKey: ["explore", "batch", courseId] });
      toast.success("Course introduction video updated.");
    },
    onError: (error) => {
      console.error("Failed to update introduction video:", error);
      toast.error("Unable to update the introduction video right now.");
    },
  });
  const deleteChapterMutation = useDeleteChapter();
  const deleteTopicMutation = useDeleteTopic();
  const deleteContentMutation = useDeleteContent();
  const deleteTopicQuizMutation = useDeleteTopicQuiz();

  const chapterOutline = (data?.data as HierarchyChapter[] | undefined) || [];
  const hiddenSubjects =
    ((subjectsResponse?.data as Array<{ id: string; name: string }> | undefined) ??
      []);
  const counts = useMemo(
    () => getChapterOutlineCounts(chapterOutline),
    [chapterOutline]
  );
  const defaultLegacySubjectId = useMemo(
    () =>
      chapterOutline.find((chapter) => chapter.legacySubjectId)
        ?.legacySubjectId ||
      hiddenSubjects[0]?.id ||
      null,
    [chapterOutline, hiddenSubjects]
  );

  const openCreateChapterModal = (subjectId?: string | null) => {
    setCreateChapterSubjectId(
      typeof subjectId === "string" ? subjectId : defaultLegacySubjectId
    );
    setIsCreateChapterOpen(true);
  };

  useEffect(() => {
    if (selection && isOutlineSelectionValid(chapterOutline, selection)) {
      return;
    }

    setSelection(getDefaultOutlineSelection(chapterOutline));
  }, [chapterOutline, selection]);

  const selectedNodes = useMemo(
    () => findOutlineSelectionNodes(chapterOutline, selection),
    [chapterOutline, selection]
  );

  useEffect(() => {
    const contents = selectedNodes.topic?.contents || [];

    if (selectedContentId && contents.some((content) => content.id === selectedContentId)) {
      return;
    }

    setSelectedContentId(contents[0]?.id || null);
  }, [selectedNodes.topic, selectedContentId]);

  const selectedContent =
    selectedNodes.topic?.contents.find((content) => content.id === selectedContentId) ||
    null;

  const invalidateHierarchy = () => {
    queryClient.invalidateQueries({
      queryKey: ["course-hierarchy", courseId],
    });
    queryClient.invalidateQueries({
      queryKey: ["course-outline", courseId],
    });
    queryClient.invalidateQueries({
      queryKey: ["subjects", "batch", courseId],
    });
  };

  const handleIntroVideoUpload = (url: string) => {
    updateIntroVideoMutation.mutate(url);
  };

  const handleRemoveIntroVideo = () => {
    updateIntroVideoMutation.mutate("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      if (deleteTarget.type === "chapter") {
        await deleteChapterMutation.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === "topic") {
        await deleteTopicMutation.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === "quiz") {
        await deleteTopicQuizMutation.mutateAsync(deleteTarget.id);
      } else {
        await deleteContentMutation.mutateAsync(deleteTarget.id);
      }

      setDeleteTarget(null);
      invalidateHierarchy();
    } catch (error) {
      console.error(`Failed to delete ${deleteTarget.type}:`, error);
    }
  };

  const openPlaygroundBuilder = (
    topicNode: HierarchyTopic,
    contentNode?: HierarchyContent | null
  ) => {
    const params = new URLSearchParams({
      topicId: topicNode.id,
      topicName: topicNode.name,
    });
    const existingPlayground = contentNode
      ? findPlaygroundForScope(batchPlaygrounds, topicNode.id, contentNode.id)
      : findPlaygroundForScope(batchPlaygrounds, topicNode.id);

    const isPlaygroundContent =
      contentNode?.type === ContentType.PLAYGROUND && !!contentNode.playgroundId;

    if (contentNode) {
      params.set("contentName", getContentName(contentNode));
    }

    if (existingPlayground?.id) {
      params.set("playgroundId", existingPlayground.id);
    }

    if (isPlaygroundContent) {
      params.set("contentId", contentNode.id);
    }

    router.push(`/${basePath}/courses/${courseId}/playgrounds?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[320px] items-center justify-center">
          <div className="text-sm text-muted-foreground">
            Loading course hierarchy...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {course && (
        <Card className="mb-6 overflow-hidden border-border/70">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  Course Introduction
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload the video that will appear on the student course page
                  and open first in the course player.
                </p>
              </div>
              {course.introVideoUrl && canManageCourse ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveIntroVideo}
                  disabled={updateIntroVideoMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove intro video
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {course.introVideoUrl ? (
              <div className="overflow-hidden rounded-2xl border bg-black">
                <div className="aspect-video w-full">
                  <UnifiedVideoPlayer
                    src={course.introVideoUrl}
                    poster={course.imageUrl}
                    type={getVideoMimeType(
                      course.introVideoType || undefined,
                      course.introVideoUrl
                    )}
                    className="h-full w-full"
                    autoplay={false}
                  />
                </div>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-center">
                <div className="space-y-2 px-6">
                  <PlayCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="font-medium text-foreground">
                    No introduction video yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add one here so students see it before they start the rest
                    of the course.
                  </p>
                </div>
              </div>
            )}

            {canManageCourse ? (
              <DetailedHLSUpload
                onUploadComplete={handleIntroVideoUpload}
                accept="video/*"
                maxSize={5000}
                folder="course-intro-videos"
                className="w-full"
              />
            ) : null}

            {updateIntroVideoMutation.isPending ? (
              <p className="text-sm text-muted-foreground">
                Saving introduction video...
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <ChapterOnlyBuilder
        chapters={chapterOutline}
        courseId={courseId}
        assignmentBasePath={basePath}
        counts={counts}
        canManageCourse={canManageCourse}
        batchPlaygrounds={batchPlaygrounds}
        selection={selection}
        setSelection={setSelection}
        selectedNodes={selectedNodes}
        selectedContent={selectedContent}
        selectedContentId={selectedContentId}
        setSelectedContentId={setSelectedContentId}
        isRefreshing={isFetching}
        onCreateChapter={openCreateChapterModal}
        setCreateTopicChapter={setCreateTopicChapter}
        setEditChapter={setEditChapter}
        setEditTopic={setEditTopic}
        setCreateContentTopic={setCreateContentTopic}
        setEditContent={setEditContent}
        setEditTopicQuizTopic={setEditTopicQuizTopic}
        setDeleteTarget={setDeleteTarget}
        onOpenPlayground={openPlaygroundBuilder}
      />

      <CreateChapterModal
        isOpen={isCreateChapterOpen}
        onClose={() => {
          setIsCreateChapterOpen(false);
          setCreateChapterSubjectId(null);
        }}
        subjectId={createChapterSubjectId || undefined}
        batchId={courseId}
        onSuccess={invalidateHierarchy}
      />

      <EditChapterModal
        isOpen={!!editChapter}
        onClose={() => setEditChapter(null)}
        chapter={editChapter}
        onSuccess={invalidateHierarchy}
      />

      <CreateTopicModal
        isOpen={!!createTopicChapter}
        onClose={() => setCreateTopicChapter(null)}
        chapterId={createTopicChapter?.id || ""}
        onSuccess={invalidateHierarchy}
      />

      <EditTopicModal
        isOpen={!!editTopic}
        onClose={() => setEditTopic(null)}
        topic={editTopic}
        onSuccess={invalidateHierarchy}
      />

      <EditTopicQuizModal
        isOpen={!!editTopicQuizTopic}
        onClose={() => setEditTopicQuizTopic(null)}
        topicId={editTopicQuizTopic?.id || ""}
        topicName={editTopicQuizTopic?.name || "Topic"}
        quiz={editTopicQuizTopic?.quiz || null}
        onSuccess={invalidateHierarchy}
      />

      <CreateContentModal
        isOpen={!!createContentTopic}
        onClose={() => setCreateContentTopic(null)}
        topicId={createContentTopic?.id || ""}
        onSuccess={invalidateHierarchy}
      />

      <EditContentModal
        isOpen={!!editContent}
        onClose={() => setEditContent(null)}
        content={
          editContent
            ? {
                ...editContent,
                name: getContentName(editContent),
              }
            : null
        }
        onSuccess={invalidateHierarchy}
      />

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type || "item"}`}
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        isLoading={
          deleteChapterMutation.isPending ||
          deleteTopicMutation.isPending ||
          deleteContentMutation.isPending ||
          deleteTopicQuizMutation.isPending
        }
      />
    </>
  );
}
