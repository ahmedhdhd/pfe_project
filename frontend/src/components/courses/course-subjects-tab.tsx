"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import {
  ClipboardList,
  BookOpen,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  GripVertical,
  Layers3,
  LibraryBig,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PlaygroundGeneratorModal } from "@/components/admin/ai/PlaygroundGeneratorModal";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { CreateChapterModal } from "@/components/common/create-chapter-modal";
import { CreateContentModal } from "@/components/common/create-content-modal";
import { CreateTopicModal } from "@/components/common/create-topic-modal";
import { DetailedHLSUpload } from "@/components/common/detailed-hls-upload";
import { EditTopicQuizModal } from "@/components/common/edit-topic-quiz-modal";
import { ContentType, VideoType } from "@/components/common/content-form";
import { EditChapterModal } from "@/components/common/edit-chapter-modal";
import { EditContentModal } from "@/components/common/edit-content-modal";
import { EditTopicModal } from "@/components/common/edit-topic-modal";
import { UnifiedVideoPlayer } from "@/components/common/unified-video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useDeleteChapter,
  useDeleteContent,
  useDeleteTopicQuiz,
  useDeleteTopic,
  useGetCourseOutline,
  useGetSubjectsByBatch,
  useReorderContents,
} from "@/hooks";
import type { TopicQuiz, TopicQuizAttemptSummary } from "@/hooks/api";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import { getVideoMimeType } from "@/components/student/course/utils";
import { buildExternalResourceDisplay } from "@/lib/utils/external-resource";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import { Batch, Subject } from "./types";

const PDFViewer = dynamic(
  () =>
    import("@/components/common/pdf-viewer").then((mod) => ({
      default: mod.PDFViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Loading PDF preview...
      </div>
    ),
  }
);

interface HierarchyContent {
  id: string;
  topicId: string;
  title?: string;
  name?: string;
  type: ContentType;
  order?: number;
  pdfUrl?: string;
  markdownBody?: string;
  externalUrl?: string;
  externalProvider?: string;
  videoUrl?: string;
  videoType?: VideoType;
  videoThumbnail?: string;
  videoDuration?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface HierarchyTopic {
  id: string;
  name: string;
  chapterId: string;
  createdAt?: string;
  updatedAt?: string;
  contents: HierarchyContent[];
  assignments?: Array<{
    id: string;
    title: string;
    description?: string | null;
    status?: string;
    _count?: { questions?: number; submissions?: number };
  }>;
  quiz?: TopicQuiz | null;
  latestQuizAttempt?: TopicQuizAttemptSummary | null;
}

interface HierarchyChapter {
  id: string;
  name: string;
  legacySubjectId?: string | null;
  legacySubjectName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  topics: HierarchyTopic[];
}

interface HierarchySubject extends Subject {
  chapters: HierarchyChapter[];
}

type Selection =
  | {
      type: "subject";
      subjectId: string;
    }
  | {
      type: "chapter";
      subjectId: string;
      chapterId: string;
    }
  | {
      type: "topic";
      subjectId: string;
      chapterId: string;
      topicId: string;
    };

type DeleteTarget =
  | {
      type: "chapter";
      id: string;
      name: string;
    }
  | {
      type: "topic";
      id: string;
      name: string;
    }
  | {
      type: "content";
      id: string;
      name: string;
    }
  | {
      type: "quiz";
      id: string;
      name: string;
    };

interface CourseSubjectsTabProps {
  canManageCourse: boolean;
  courseId: string;
  course?: Batch | null;
  basePath?: "admin" | "teacher";
  onCreateSubject?: () => void;
  onEditSubject?: (subject: Subject) => void;
  onDeleteSubject?: (subject: Subject) => void;
}

export function CourseSubjectsTab({
  canManageCourse,
  courseId,
  course,
  basePath = "admin",
  onCreateSubject,
  onEditSubject,
  onDeleteSubject,
}: CourseSubjectsTabProps) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(
    null
  );
  const [createChapterSubject, setCreateChapterSubject] =
    useState<HierarchySubject | null>(null);
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
  const [playgroundContext, setPlaygroundContext] = useState<{
    topicId: string;
    contentId?: string;
    topicName: string;
    contentName?: string;
  } | null>(null);

  const { data, isLoading, isFetching } = useGetCourseOutline(courseId);
  const { data: subjectsResponse } = useGetSubjectsByBatch(courseId);
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
  const hierarchy = chapterOutline as unknown as HierarchySubject[];
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
        onOpenPlayground={(topicNode, contentNode) =>
          setPlaygroundContext({
            topicId: topicNode.id,
            contentId: contentNode?.id,
            topicName: topicNode.name,
            contentName: contentNode ? getContentName(contentNode) : undefined,
          })
        }
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

      <PlaygroundGeneratorModal
        isOpen={!!playgroundContext}
        onClose={() => setPlaygroundContext(null)}
        batchId={courseId}
        topicId={playgroundContext?.topicId}
        contentId={playgroundContext?.contentId}
        onSuccess={(playground) => {
          toast.success(
            `AI playground generated for ${
              playgroundContext?.contentName ||
              playgroundContext?.topicName ||
              "this topic"
            }.`
          );
          console.log("Playground created", playground);
        }}
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

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden border-border/70">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2">
                  <Layers3 className="h-5 w-5 text-primary" />
                  Course Builder
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{counts.chapters} chapters</Badge>
                  <Badge variant="secondary">{counts.topics} topics</Badge>
                </div>
              </div>
              {canManageCourse && (
                <Button
                  size="sm"
                  onClick={() => openCreateChapterModal()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Chapter
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {hierarchy.length === 0 ? (
              <div className="space-y-4 p-6 text-center">
                <LibraryBig className="mx-auto h-10 w-10 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">No chapters yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start by creating a chapter, then add topics and content
                    from the same screen.
                  </p>
                </div>
                {canManageCourse && (
                  <Button
                    onClick={() => openCreateChapterModal()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Chapter
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[720px]">
                <div className="space-y-4 p-4">
                  {hierarchy.map((subject) => (
                    <div
                      key={subject.id}
                      className="rounded-2xl border border-border/70 bg-background/60 p-3 shadow-sm"
                    >
                      <HierarchyRow
                        label={subject.name}
                        icon={LibraryBig}
                        isSelected={
                          selection?.type === "subject" &&
                          selection.subjectId === subject.id
                        }
                        meta={`${subject.chapters.length} chapters`}
                        onClick={() =>
                          setSelection({
                            type: "subject",
                            subjectId: subject.id,
                          })
                        }
                        createLabel="Add chapter"
                        onCreate={
                          canManageCourse
                            ? () => setCreateChapterSubject(subject)
                            : undefined
                        }
                        onEdit={
                          canManageCourse ? () => onEditSubject(subject) : undefined
                        }
                        onDelete={
                          canManageCourse
                            ? () => onDeleteSubject(subject)
                            : undefined
                        }
                      />

                      <div className="mt-3 space-y-2 pl-4">
                        {subject.chapters.length === 0 ? (
                          <p className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
                            No chapters in this subject yet.
                          </p>
                        ) : (
                          subject.chapters.map((chapter) => (
                            <div key={chapter.id} className="space-y-2">
                              <HierarchyRow
                                label={chapter.name}
                                icon={BookOpen}
                                isSelected={
                                  selection?.type === "chapter" &&
                                  selection.chapterId === chapter.id
                                }
                                meta={`${chapter.topics.length} topics`}
                                onClick={() =>
                                  setSelection({
                                    type: "chapter",
                                    subjectId: subject.id,
                                    chapterId: chapter.id,
                                  })
                                }
                                createLabel="Add topic"
                                onCreate={
                                  canManageCourse
                                    ? () => setCreateTopicChapter(chapter)
                                    : undefined
                                }
                                onEdit={
                                  canManageCourse
                                    ? () => setEditChapter(chapter)
                                    : undefined
                                }
                                onDelete={
                                  canManageCourse
                                    ? () =>
                                        setDeleteTarget({
                                          type: "chapter",
                                          id: chapter.id,
                                          name: chapter.name,
                                        })
                                    : undefined
                                }
                              />

                              <div className="space-y-2 pl-4">
                                {chapter.topics.length === 0 ? (
                                  <p className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
                                    No topics in this chapter yet.
                                  </p>
                                ) : (
                                  chapter.topics.map((topic) => (
                                    <HierarchyRow
                                      key={topic.id}
                                      label={topic.name}
                                      icon={FolderOpen}
                                      isSelected={
                                        selection?.type === "topic" &&
                                        selection.topicId === topic.id
                                      }
                                meta={`${topic.contents.length + (topic.assignments?.length || 0)} items`}
                                      onClick={() => {
                                        setSelection({
                                          type: "topic",
                                          subjectId: subject.id,
                                          chapterId: chapter.id,
                                          topicId: topic.id,
                                        });
                                      }}
                                      createLabel="Add content"
                                      onCreate={
                                        canManageCourse
                                          ? () => setCreateContentTopic(topic)
                                          : undefined
                                      }
                                      onEdit={
                                        canManageCourse
                                          ? () => setEditTopic(topic)
                                          : undefined
                                      }
                                      onDelete={
                                        canManageCourse
                                          ? () =>
                                              setDeleteTarget({
                                                type: "topic",
                                                id: topic.id,
                                                name: topic.name,
                                              })
                                          : undefined
                                      }
                                    />
                                  ))
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedNodes.topic ? (
            <TopicWorkspace
              courseId={courseId}
              assignmentBasePath={basePath}
              subject={selectedNodes.subject}
              chapter={selectedNodes.chapter}
              topic={selectedNodes.topic}
              selectedContent={selectedContent}
              selectedContentId={selectedContentId}
              isRefreshing={isFetching}
              canManageCourse={canManageCourse}
              onAddContent={() => setCreateContentTopic(selectedNodes.topic!)}
              onSelectContent={(contentId) => setSelectedContentId(contentId)}
              onEditContent={(content) => setEditContent(content)}
              onDeleteContent={(content) =>
                setDeleteTarget({
                  type: "content",
                  id: content.id,
                  name: getContentName(content),
                })
              }
              onOpenPlayground={(content) =>
                setPlaygroundContext({
                  topicId: selectedNodes.topic!.id,
                  contentId: content?.id,
                  topicName: selectedNodes.topic!.name,
                  contentName: content ? getContentName(content) : undefined,
                })
              }
              onManageQuiz={() => setEditTopicQuizTopic(selectedNodes.topic!)}
              onDeleteQuiz={
                selectedNodes.topic?.quiz
                  ? () =>
                      setDeleteTarget({
                        type: "quiz",
                        id: selectedNodes.topic!.id,
                        name:
                          selectedNodes.topic!.quiz?.title ||
                          `${selectedNodes.topic!.name} quiz`,
                      })
                  : undefined
              }
            />
          ) : selectedNodes.chapter ? (
            <SelectionSummary
              title={selectedNodes.chapter.name}
              description="Create topics on the left, then select one to manage its content here."
              breadcrumbs={[
                selectedNodes.subject?.name || "Subject",
                selectedNodes.chapter.name,
              ]}
              stats={[
                `${selectedNodes.chapter.topics.length} topics`,
                `${selectedNodes.chapter.topics.reduce(
                  (total, topic) => total + topic.contents.length,
                  0
                )} content items`,
              ]}
              action={
                canManageCourse
                  ? {
                      label: "Add Topic",
                      onClick: () =>
                        selectedNodes.chapter &&
                        setCreateTopicChapter(selectedNodes.chapter),
                    }
                  : undefined
              }
            />
          ) : selectedNodes.subject ? (
            <SelectionSummary
              title={selectedNodes.subject.name}
              description="Use the sidebar to add chapters and topics, then choose a topic to manage its lectures and PDFs here."
              breadcrumbs={[selectedNodes.subject.name]}
              stats={[
                `${selectedNodes.subject.chapters.length} chapters`,
                `${selectedNodes.subject.chapters.reduce(
                  (total, chapter) => total + chapter.topics.length,
                  0
                )} topics`,
              ]}
              action={
                canManageCourse
                  ? {
                      label: "Add Chapter",
                      onClick: () =>
                        selectedNodes.subject &&
                        setCreateChapterSubject(selectedNodes.subject),
                    }
                  : undefined
              }
            />
          ) : (
            <SelectionSummary
              title="Select a topic"
              description="Choose a topic from the course hierarchy to see and manage its content on this side."
              breadcrumbs={["Course hierarchy"]}
              stats={[`${counts.contents} total content items`]}
            />
          )}
        </div>
      </div>

      <CreateChapterModal
        isOpen={!!createChapterSubject}
        onClose={() => setCreateChapterSubject(null)}
        subjectId={createChapterSubject?.id || ""}
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

function TopicWorkspace({
  courseId,
  assignmentBasePath,
  subject,
  chapter,
  topic,
  selectedContent,
  selectedContentId,
  isRefreshing,
  canManageCourse,
  onAddContent,
  onSelectContent,
  onEditContent,
  onDeleteContent,
  onOpenPlayground,
  onManageQuiz,
  onDeleteQuiz,
}: {
  courseId: string;
  assignmentBasePath: "admin" | "teacher";
  subject: HierarchySubject | null;
  chapter: HierarchyChapter | null;
  topic: HierarchyTopic;
  selectedContent: HierarchyContent | null;
  selectedContentId: string | null;
  isRefreshing: boolean;
  canManageCourse: boolean;
  onAddContent: () => void;
  onSelectContent: (contentId: string) => void;
  onEditContent: (content: HierarchyContent) => void;
  onDeleteContent: (content: HierarchyContent) => void;
  onOpenPlayground: (content?: HierarchyContent | null) => void;
  onManageQuiz: () => void;
  onDeleteQuiz?: () => void;
}) {
  const reorderContentsMutation = useReorderContents();
  const [orderedContents, setOrderedContents] = useState<HierarchyContent[]>(
    topic.contents
  );
  const [draggedContentId, setDraggedContentId] = useState<string | null>(null);
  const [isContentPreviewOpen, setIsContentPreviewOpen] = useState(true);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  useEffect(() => {
    setOrderedContents(topic.contents);
    setDraggedContentId(null);
  }, [topic]);

  useEffect(() => {
    setIsContentPreviewOpen(true);
    setIsPreviewExpanded(false);
  }, [topic.id]);

  useEffect(() => {
    if (!isContentPreviewOpen) {
      setIsPreviewExpanded(false);
    }
  }, [isContentPreviewOpen]);

  const topicAssignments = topic.assignments || [];
  const assignmentCreateHref = `/${assignmentBasePath}/assignments?new=1&batchId=${encodeURIComponent(
    courseId
  )}&topicId=${encodeURIComponent(topic.id)}`;
  const assignmentEditHref = (assignmentId: string) =>
    `/${assignmentBasePath}/assignments/${assignmentId}`;

  const handleContentDrop = async (targetContentId: string) => {
    if (!canManageCourse || !draggedContentId || draggedContentId === targetContentId) {
      setDraggedContentId(null);
      return;
    }

    const draggedIndex = orderedContents.findIndex(
      (content) => content.id === draggedContentId
    );
    const targetIndex = orderedContents.findIndex(
      (content) => content.id === targetContentId
    );

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedContentId(null);
      return;
    }

    const previousContents = orderedContents;
    const reorderedContents = [...orderedContents];
    const [draggedContent] = reorderedContents.splice(draggedIndex, 1);
    const insertionIndex =
      draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    reorderedContents.splice(insertionIndex, 0, draggedContent);

    setOrderedContents(reorderedContents);
    setDraggedContentId(null);

    try {
      await reorderContentsMutation.mutateAsync({
        topicId: topic.id,
        orderedContentIds: reorderedContents.map((content) => content.id),
      });
    } catch (error) {
      console.error("Failed to reorder topic contents:", error);
      setOrderedContents(previousContents);
      toast.error("Could not save the new content order.");
    }
  };

  return (
    <Card className="overflow-hidden border-border/70">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {subject?.name && <span>{subject.name}</span>}
              {chapter?.name && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span>{chapter.name}</span>
                </>
              )}
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{topic.name}</span>
            </div>
            <div>
              <CardTitle className="text-2xl">{topic.name}</CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Add lessons and assignments from the same workspace, then
                preview the selected lesson without leaving the course page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {orderedContents.length + topicAssignments.length} items
              </Badge>
              {isRefreshing && <Badge variant="outline">Refreshing...</Badge>}
            </div>
          </div>

          {canManageCourse && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenPlayground(selectedContent)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Playground
              </Button>
              <Button onClick={onAddContent}>
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </Button>
              <Button asChild variant="outline">
                <Link href={assignmentCreateHref}>
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Add Assignment
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {orderedContents.length === 0 && topicAssignments.length === 0 ? (
          <div className="space-y-4 p-10 text-center">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No content in this topic yet</p>
              <p className="text-sm text-muted-foreground">
                Add a lesson or assignment to start building this topic.
              </p>
            </div>
            {canManageCourse && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenPlayground(selectedContent)}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Playground
                  </Button>
                  <Button onClick={onAddContent}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Content
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={assignmentCreateHref}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Add Assignment
                    </Link>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Content cards become draggable as soon as this topic has more
                  than one item.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "grid min-h-[720px]",
              isContentPreviewOpen
                ? isPreviewExpanded
                  ? "xl:grid-cols-[minmax(0,1fr)]"
                  : "xl:grid-cols-[360px_minmax(0,1fr)]"
                : "xl:grid-cols-[minmax(0,1fr)]"
            )}
          >
            <div
              className={cn(
                "border-b bg-muted/10 xl:border-b-0 xl:border-r",
                isPreviewExpanded && "hidden"
              )}
            >
              <ScrollArea className="h-[320px] xl:h-[720px]">
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Topic content</p>
                      <p className="text-xs text-muted-foreground">
                        Select an item to preview it on the right.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setIsContentPreviewOpen((current) => !current)
                      }
                    >
                      {isContentPreviewOpen ? (
                        <EyeOff className="mr-2 h-4 w-4" />
                      ) : (
                        <Eye className="mr-2 h-4 w-4" />
                      )}
                      {isContentPreviewOpen ? "Hide Preview" : "Show Preview"}
                    </Button>
                  </div>
                  {orderedContents.map((content) => (
                    <div
                      key={content.id}
                      draggable={canManageCourse}
                      onClick={() => onSelectContent(content.id)}
                      onDragStart={(event) => {
                        if (!canManageCourse) {
                          return;
                        }

                        setDraggedContentId(content.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", content.id);
                      }}
                      onDragOver={(event) => {
                        if (!canManageCourse || !draggedContentId) {
                          return;
                        }

                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        void handleContentDrop(content.id);
                      }}
                      onDragEnd={() => setDraggedContentId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectContent(content.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "w-full cursor-pointer rounded-2xl border p-4 text-left transition hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        canManageCourse && "cursor-grab active:cursor-grabbing",
                        selectedContentId === content.id &&
                          "border-primary bg-primary/5 shadow-sm",
                        draggedContentId === content.id && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            {canManageCourse ? (
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            ) : null}
                            {content.type === "Lecture" ? (
                              <PlayCircle className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <FileText className="h-4 w-4 text-amber-600" />
                            )}
                            <span className="font-medium">
                              {getContentName(content)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{content.type}</Badge>
                            {content.videoType && (
                              <Badge variant="outline">{content.videoType}</Badge>
                            )}
                            {content.videoDuration ? (
                              <Badge variant="outline">
                                {formatDuration(content.videoDuration)}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        {canManageCourse && (
                          <div onClick={(event) => event.stopPropagation()}>
                            <ActionMenu
                              onEdit={() => onEditContent(content)}
                              onDelete={() => onDeleteContent(content)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {canManageCourse ? (
                    <p className="px-1 text-xs text-muted-foreground">
                      Drag and drop to reorder the content cards in this topic.
                    </p>
                  ) : null}

                  {topicAssignments.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Assignments
                      </p>
                      {topicAssignments.map((assignment) => (
                        <Link
                          key={assignment.id}
                          href={assignmentEditHref(assignment.id)}
                          className="block w-full rounded-2xl border border-dashed p-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
                        >
                          <div className="flex items-start gap-2">
                            <ClipboardList className="mt-0.5 h-4 w-4 text-primary" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="font-medium">{assignment.title}</div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">ASSIGNMENT</Badge>
                                <Badge variant="outline">
                                  {assignment._count?.questions ?? 0} questions
                                </Badge>
                              </div>
                              {assignment.description ? (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {assignment.description}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>

            {isContentPreviewOpen ? (
              <div className="space-y-4 p-5">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewExpanded((current) => !current)}
                  >
                    {isPreviewExpanded ? (
                      <Minimize2 className="mr-2 h-4 w-4" />
                    ) : (
                      <Maximize2 className="mr-2 h-4 w-4" />
                    )}
                    {isPreviewExpanded ? "Collapse Preview" : "Expand Preview"}
                  </Button>
                </div>
                {selectedContent ? (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold">
                          {getContentName(selectedContent)}
                        </h3>
                        <Badge variant="secondary">{selectedContent.type}</Badge>
                        {selectedContent.videoType && (
                          <Badge variant="outline">
                            {selectedContent.videoType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Preview the selected content and manage the topic from the
                        same workspace.
                      </p>
                    </div>

                    <ContentPreview content={selectedContent} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                    Select a content item to preview it here.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChapterOnlyBuilder({
  chapters,
  courseId,
  assignmentBasePath,
  counts,
  canManageCourse,
  selection,
  setSelection,
  selectedNodes,
  selectedContent,
  selectedContentId,
  setSelectedContentId,
  isRefreshing,
  onCreateChapter,
  setCreateTopicChapter,
  setEditChapter,
  setEditTopic,
  setCreateContentTopic,
  setEditContent,
  setEditTopicQuizTopic,
  setDeleteTarget,
  onOpenPlayground,
}: {
  chapters: HierarchyChapter[];
  courseId: string;
  assignmentBasePath: "admin" | "teacher";
  counts: ReturnType<typeof getChapterOutlineCounts>;
  canManageCourse: boolean;
  selection: Selection | null;
  setSelection: (selection: Selection | null) => void;
  selectedNodes: {
    chapter: HierarchyChapter | null;
    topic: HierarchyTopic | null;
  };
  selectedContent: HierarchyContent | null;
  selectedContentId: string | null;
  setSelectedContentId: (contentId: string | null) => void;
  isRefreshing: boolean;
  onCreateChapter: () => void;
  setCreateTopicChapter: (chapter: HierarchyChapter | null) => void;
  setEditChapter: (chapter: HierarchyChapter | null) => void;
  setEditTopic: (topic: HierarchyTopic | null) => void;
  setCreateContentTopic: (topic: HierarchyTopic | null) => void;
  setEditContent: (content: HierarchyContent | null) => void;
  setEditTopicQuizTopic: (topic: HierarchyTopic | null) => void;
  setDeleteTarget: (target: DeleteTarget | null) => void;
  onOpenPlayground: (
    topic: HierarchyTopic,
    content?: HierarchyContent | null
  ) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card className="overflow-hidden border-border/70">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-primary" />
                Course Builder
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{counts.chapters} chapters</Badge>
                <Badge variant="secondary">{counts.topics} topics</Badge>
              </div>
            </div>
            {canManageCourse && (
              <Button
                size="sm"
                onClick={onCreateChapter}
              >
                <Plus className="mr-2 h-4 w-4" />
                Chapter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {chapters.length === 0 ? (
            <div className="space-y-4 p-6 text-center">
              <LibraryBig className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium">No chapters yet</p>
                <p className="text-sm text-muted-foreground">
                  Start by creating a chapter, then add topics and content from
                  the same screen.
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[720px]">
              <div className="space-y-4 p-4">
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="rounded-2xl border border-border/70 bg-background/60 p-3 shadow-sm"
                  >
                    <HierarchyRow
                      label={chapter.name}
                      icon={BookOpen}
                      isSelected={
                        selection?.type === "chapter" &&
                        selection.chapterId === chapter.id
                      }
                      meta={`${chapter.topics.length} topics`}
                      onClick={() =>
                        setSelection({
                          type: "chapter",
                          subjectId: chapter.legacySubjectId || "",
                          chapterId: chapter.id,
                        })
                      }
                      createLabel="Add topic"
                      onCreate={
                        canManageCourse
                          ? () => setCreateTopicChapter(chapter)
                          : undefined
                      }
                      onEdit={
                        canManageCourse ? () => setEditChapter(chapter) : undefined
                      }
                      onDelete={
                        canManageCourse
                          ? () =>
                              setDeleteTarget({
                                type: "chapter",
                                id: chapter.id,
                                name: chapter.name,
                              })
                          : undefined
                      }
                    />

                    <div className="mt-3 space-y-2 pl-4">
                      {chapter.topics.length === 0 ? (
                        <p className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
                          No topics in this chapter yet.
                        </p>
                      ) : (
                        chapter.topics.map((topic) => (
                          <HierarchyRow
                            key={topic.id}
                            label={topic.name}
                            icon={FolderOpen}
                            isSelected={
                              selection?.type === "topic" &&
                              selection.topicId === topic.id
                            }
                            meta={`${topic.contents.length + (topic.assignments?.length || 0)} items`}
                            onClick={() =>
                              setSelection({
                                type: "topic",
                                subjectId: chapter.legacySubjectId || "",
                                chapterId: chapter.id,
                                topicId: topic.id,
                              })
                            }
                            createLabel="Add content"
                            onCreate={
                              canManageCourse
                                ? () => setCreateContentTopic(topic)
                                : undefined
                            }
                            onEdit={
                              canManageCourse ? () => setEditTopic(topic) : undefined
                            }
                            onDelete={
                              canManageCourse
                                ? () =>
                                    setDeleteTarget({
                                      type: "topic",
                                      id: topic.id,
                                      name: topic.name,
                                    })
                                : undefined
                            }
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {selectedNodes.topic ? (
          <TopicWorkspace
            courseId={courseId}
            assignmentBasePath={assignmentBasePath}
            subject={null}
            chapter={selectedNodes.chapter}
            topic={selectedNodes.topic}
            selectedContent={selectedContent}
            selectedContentId={selectedContentId}
            isRefreshing={isRefreshing}
            canManageCourse={canManageCourse}
            onAddContent={() => setCreateContentTopic(selectedNodes.topic)}
            onSelectContent={(contentId) => setSelectedContentId(contentId)}
            onEditContent={(content) => setEditContent(content)}
            onDeleteContent={(content) =>
              setDeleteTarget({
                type: "content",
                id: content.id,
                name: getContentName(content),
              })
            }
            onOpenPlayground={(content) =>
              onOpenPlayground(selectedNodes.topic, content)
            }
            onManageQuiz={() => setEditTopicQuizTopic(selectedNodes.topic)}
            onDeleteQuiz={
              selectedNodes.topic.quiz
                ? () =>
                    setDeleteTarget({
                      type: "quiz",
                      id: selectedNodes.topic.id,
                      name:
                        selectedNodes.topic.quiz?.title ||
                        `${selectedNodes.topic.name} quiz`,
                    })
                : undefined
            }
          />
        ) : selectedNodes.chapter ? (
          <SelectionSummary
            title={selectedNodes.chapter.name}
            description="Create topics on the left, then select one to manage its content here."
            breadcrumbs={[selectedNodes.chapter.name]}
            stats={[
              `${selectedNodes.chapter.topics.length} topics`,
              `${selectedNodes.chapter.topics.reduce(
                (total, topic) =>
                  total + topic.contents.length + (topic.assignments?.length || 0),
                0
              )} items`,
            ]}
            action={
              canManageCourse
                ? {
                    label: "Add Topic",
                    onClick: () => setCreateTopicChapter(selectedNodes.chapter),
                  }
                : undefined
            }
          />
        ) : (
          <SelectionSummary
            title="Select a chapter or topic"
            description="Choose a topic from the course builder to see and manage its content on this side."
            breadcrumbs={["Course hierarchy"]}
            stats={[
              `${counts.chapters} chapters`,
              `${counts.contents} total content items`,
            ]}
            action={
              canManageCourse
                ? {
                    label: "Add Chapter",
                    onClick: onCreateChapter,
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

function SelectionSummary({
  title,
  description,
  breadcrumbs,
  stats,
  action,
}: {
  title: string;
  description: string;
  breadcrumbs: string[];
  stats: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {breadcrumbs.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <Badge key={stat} variant="secondary">
              {stat}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function HierarchyRow({
  label,
  icon: Icon,
  meta,
  isSelected,
  onClick,
  createLabel,
  onCreate,
  onEdit,
  onDelete,
}: {
  label: string;
  icon: typeof LibraryBig;
  meta: string;
  isSelected: boolean;
  onClick: () => void;
  createLabel?: string;
  onCreate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        isSelected && "border-primary bg-primary/5"
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>

      {(onCreate || onEdit || onDelete) && (
        <div
          className="flex items-center gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          {onCreate && createLabel ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onCreate}
              title={createLabel}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}

          {(onEdit || onDelete) && (
            <ActionMenu onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>
      )}
    </div>
  );
}

function ActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {onEdit && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContentPreview({ content }: { content: HierarchyContent }) {
  if (content.type === "Lecture" && content.videoUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-black">
        <UnifiedVideoPlayer
          src={content.videoUrl}
          poster={content.videoThumbnail}
          type={getVideoMimeType(content.videoType, content.videoUrl)}
          className="w-full"
        />
      </div>
    );
  }

  if (content.type === "PDF" && content.pdfUrl) {
    return (
      <PDFViewer
        fileUrl={content.pdfUrl}
        title={getContentName(content)}
        height="640px"
      />
    );
  }

  if (content.type === ContentType.MARKDOWN && content.markdownBody) {
    return (
      <article className="max-h-[640px] overflow-y-auto rounded-2xl border bg-card p-6">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="mb-4 text-2xl font-bold">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-3 mt-6 text-xl font-semibold">{children}</h2>
            ),
            p: ({ children }) => (
              <p className="mb-3 leading-7 text-muted-foreground">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 list-disc space-y-1 pl-6 text-muted-foreground">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 list-decimal space-y-1 pl-6 text-muted-foreground">
                {children}
              </ol>
            ),
          }}
        >
          {content.markdownBody}
        </ReactMarkdown>
      </article>
    );
  }

  const externalResource = buildExternalResourceDisplay(
    content.externalUrl,
    content.externalProvider
  );

  if (content.type === ContentType.URL && externalResource) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">
              {externalResource.providerLabel}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              {externalResource.normalizedUrl}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <a
              href={externalResource.normalizedUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          </Button>
        </div>
        {externalResource.embedUrl ? (
          <iframe
            src={externalResource.embedUrl}
            title={getContentName(content)}
            className="h-[600px] w-full border-0 bg-white"
            sandbox="allow-forms allow-popups allow-presentation allow-same-origin allow-scripts"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
            This resource cannot be embedded directly. Open it in a new tab.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      This content does not have a previewable asset yet.
    </div>
  );
}

function getHierarchyCounts(hierarchy: HierarchySubject[]) {
  return hierarchy.reduce(
    (totals, subject) => {
      totals.subjects += 1;
      totals.chapters += subject.chapters.length;

      subject.chapters.forEach((chapter) => {
        totals.topics += chapter.topics.length;
        chapter.topics.forEach((topic) => {
          totals.contents += topic.contents.length + (topic.assignments?.length || 0);
        });
      });

      return totals;
    },
    {
      subjects: 0,
      chapters: 0,
      topics: 0,
      contents: 0,
    }
  );
}

function getChapterOutlineCounts(hierarchy: HierarchyChapter[]) {
  return hierarchy.reduce(
    (totals, chapter) => {
      totals.chapters += 1;
      totals.topics += chapter.topics.length;
      chapter.topics.forEach((topic) => {
        totals.contents += topic.contents.length + (topic.assignments?.length || 0);
      });

      return totals;
    },
    {
      subjects: 0,
      chapters: 0,
      topics: 0,
      contents: 0,
    }
  );
}

function getDefaultOutlineSelection(
  hierarchy: HierarchyChapter[]
): Selection | null {
  const firstChapter = hierarchy[0];
  if (!firstChapter) {
    return null;
  }

  const firstTopic = firstChapter.topics[0];

  if (firstTopic) {
    return {
      type: "topic",
      subjectId: firstChapter.legacySubjectId || "",
      chapterId: firstChapter.id,
      topicId: firstTopic.id,
    };
  }

  return {
    type: "chapter",
    subjectId: firstChapter.legacySubjectId || "",
    chapterId: firstChapter.id,
  };
}

function isOutlineSelectionValid(
  hierarchy: HierarchyChapter[],
  selection: Selection | null
): boolean {
  if (!selection || selection.type === "subject") {
    return false;
  }

  const chapter = hierarchy.find((item) => item.id === selection.chapterId);
  if (!chapter) {
    return false;
  }

  if (selection.type === "chapter") {
    return true;
  }

  return chapter.topics.some((item) => item.id === selection.topicId);
}

function findOutlineSelectionNodes(
  hierarchy: HierarchyChapter[],
  selection: Selection | null
) {
  if (!selection || selection.type === "subject") {
    return {
      subject: null,
      chapter: null,
      topic: null,
    };
  }

  const chapter = hierarchy.find((item) => item.id === selection.chapterId) || null;
  const topic =
    selection.type === "topic" && chapter
      ? chapter.topics.find((item) => item.id === selection.topicId) || null
      : null;

  return {
    subject: null,
    chapter,
    topic,
  };
}

function getDefaultSelection(hierarchy: HierarchySubject[]): Selection | null {
  const firstSubject = hierarchy[0];
  if (!firstSubject) {
    return null;
  }

  const firstChapter = firstSubject.chapters[0];
  const firstTopic = firstChapter?.topics[0];

  if (firstTopic && firstChapter) {
    return {
      type: "topic",
      subjectId: firstSubject.id,
      chapterId: firstChapter.id,
      topicId: firstTopic.id,
    };
  }

  if (firstChapter) {
    return {
      type: "chapter",
      subjectId: firstSubject.id,
      chapterId: firstChapter.id,
    };
  }

  return {
    type: "subject",
    subjectId: firstSubject.id,
  };
}

function isSelectionValid(
  hierarchy: HierarchySubject[],
  selection: Selection | null
): boolean {
  if (!selection) {
    return false;
  }

  const subject = hierarchy.find((item) => item.id === selection.subjectId);
  if (!subject) {
    return false;
  }

  if (selection.type === "subject") {
    return true;
  }

  const chapter = subject.chapters.find((item) => item.id === selection.chapterId);
  if (!chapter) {
    return false;
  }

  if (selection.type === "chapter") {
    return true;
  }

  return chapter.topics.some((item) => item.id === selection.topicId);
}

function findSelectionNodes(
  hierarchy: HierarchySubject[],
  selection: Selection | null
) {
  if (!selection) {
    return {
      subject: null,
      chapter: null,
      topic: null,
    };
  }

  const subject = hierarchy.find((item) => item.id === selection.subjectId) || null;
  const chapter =
    selection.type !== "subject" && subject
      ? subject.chapters.find((item) => item.id === selection.chapterId) || null
      : null;
  const topic =
    selection.type === "topic" && chapter
      ? chapter.topics.find((item) => item.id === selection.topicId) || null
      : null;

  return {
    subject,
    chapter,
    topic,
  };
}

function getContentName(content: HierarchyContent) {
  return content.name || content.title || "Untitled content";
}

