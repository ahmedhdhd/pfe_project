"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  GripVertical,
  LayoutTemplate,
  Maximize2,
  Minimize2,
  PlayCircle,
  Plus,
  Sparkles,
} from "@/components/icons";
import { ContentType } from "@/components/common/content-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReorderContents } from "@/hooks";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import { ActionMenu } from "./shared-parts";
import { ContentPreview } from "./content-preview";
import { getContentName } from "./helpers";
import type {
  HierarchyChapter,
  HierarchyContent,
  HierarchySubject,
  HierarchyTopic,
} from "./types";

export function TopicWorkspace({
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
  hasSavedPlayground = false,
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
  hasSavedPlayground?: boolean;
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
                {hasSavedPlayground ? (
                  <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                    Saved
                  </Badge>
                ) : null}
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
                            ) : content.type === ContentType.PLAYGROUND ? (
                              <LayoutTemplate className="h-4 w-4 text-primary" />
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
