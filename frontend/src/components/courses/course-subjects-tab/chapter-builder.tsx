"use client";

import { BookOpen, FolderOpen, Layers3, LibraryBig, Plus } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AiPlayground } from "@/lib/types/api";
import { HierarchyRow, SelectionSummary } from "./shared-parts";
import { TopicWorkspace } from "./topic-workspace";
import { getChapterOutlineCounts, getContentName } from "./helpers";
import type {
  DeleteTarget,
  HierarchyChapter,
  HierarchyContent,
  HierarchyTopic,
  Selection,
} from "./types";

export function ChapterOnlyBuilder({
  chapters,
  courseId,
  assignmentBasePath,
  counts,
  canManageCourse,
  batchPlaygrounds,
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
  batchPlaygrounds: AiPlayground[];
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
  const activeTopic = selectedNodes.topic;

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
        {activeTopic ? (
          <TopicWorkspace
            courseId={courseId}
            assignmentBasePath={assignmentBasePath}
            subject={null}
            chapter={selectedNodes.chapter}
            topic={activeTopic}
            selectedContent={selectedContent}
            selectedContentId={selectedContentId}
            isRefreshing={isRefreshing}
            canManageCourse={canManageCourse}
            hasSavedPlayground={
              batchPlaygrounds.some(
                (playground) => playground.topicId === activeTopic.id
              )
            }
            onAddContent={() => setCreateContentTopic(activeTopic)}
            onSelectContent={(contentId) => setSelectedContentId(contentId)}
            onEditContent={(content) => setEditContent(content)}
            onDeleteContent={(content) =>
              setDeleteTarget({
                type: "content",
                id: content.id,
                name: getContentName(content),
              })
            }
            onOpenPlayground={(content) => onOpenPlayground(activeTopic, content)}
            onManageQuiz={() => setEditTopicQuizTopic(activeTopic)}
            onDeleteQuiz={
              activeTopic.quiz
                ? () =>
                    setDeleteTarget({
                      type: "quiz",
                      id: activeTopic.id,
                      name: activeTopic.quiz?.title || `${activeTopic.name} quiz`,
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
