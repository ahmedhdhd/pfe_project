"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FolderTree,
  Search,
  Video,
  X,
  ClipboardList,
} from "@/components/icons";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CourseHierarchySubject } from "@/lib/course-navigation";
import type { Content } from "../utils/content-player-utils";
import { buildContentPath, formatDuration } from "../utils/content-player-utils";

interface TopicResourceItem {
  id: string;
  title: string;
  description?: string;
  pdfUrl: string;
}

interface LessonItem {
  id: string;
  name: string | undefined;
  title: string | undefined;
  type: string | undefined;
  videoDuration: number | null;
  isCompleted: boolean;
}

interface TopicWithResources {
  id: string;
  name: string;
  assignments: Array<{
    id: string;
    title: string;
    description?: string | null;
    _count?: { questions?: number; submissions?: number };
  }>;
  contents: LessonItem[];
  resources: TopicResourceItem[];
}

interface ChapterWithResources {
  id: string;
  name: string;
  topics: TopicWithResources[];
}

interface SubjectWithResources {
  id: string;
  name: string;
  chapters: ChapterWithResources[];
}

interface ContentPlayerSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  hierarchy: CourseHierarchySubject[];
  contents: Content[];
  currentSubjectId: string;
  currentChapterId: string;
  currentTopicId: string;
  currentContentId: string;
  batchId: string;
  introVideo?: {
    id: string;
    title: string;
    href: string;
  } | null;
  sidebarOpen: boolean;
  currentContentRef: RefObject<HTMLAnchorElement | null>;
  buildContentHref?: (params: {
    batchId: string;
    subjectId: string;
    chapterId: string;
    topicId: string;
    contentId: string;
  }) => string;
  onClose?: () => void;
}

export function ContentPlayerSidebar({
  searchQuery,
  onSearchChange,
  hierarchy,
  contents,
  currentSubjectId,
  currentChapterId,
  currentTopicId,
  currentContentId,
  batchId,
  introVideo,
  sidebarOpen,
  currentContentRef,
  buildContentHref,
  onClose,
}: ContentPlayerSidebarProps) {
  const resolveContentHref = ({
    batchId: targetBatchId,
    subjectId,
    chapterId,
    topicId,
    contentId,
  }: {
    batchId: string;
    subjectId: string;
    chapterId: string;
    topicId: string;
    contentId: string;
  }) =>
    buildContentHref
      ? buildContentHref({
          batchId: targetBatchId,
          subjectId,
          chapterId,
          topicId,
          contentId,
        })
      : buildContentPath(
          targetBatchId,
          subjectId,
          chapterId,
          topicId,
          contentId
        );

  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [expandedTopics, setExpandedTopics] = useState<string[]>([]);

  const currentTopicContentMap = useMemo(
    () => new Map(contents.map((content) => [content.id, content])),
    [contents]
  );

  const lessonsHierarchy = useMemo<SubjectWithResources[]>(() => {
    return hierarchy
      .map<SubjectWithResources | null>((subject) => {
        const chapters = (subject.chapters || [])
          .map<ChapterWithResources | null>((chapter) => {
            const topics = (chapter.topics || [])
              .map<TopicWithResources | null>((topic) => {
                const mergedContents = (topic.contents || []).map((content) =>
                  topic.id === currentTopicId
                    ? currentTopicContentMap.get(content.id) || content
                    : content
                );

                const lessons = mergedContents.filter((content) =>
                  ["LECTURE", "MARKDOWN", "URL"].includes(
                    (content.type || "").toUpperCase()
                  )
                );
                const resources: TopicResourceItem[] = mergedContents
                  .filter(
                    (content) =>
                      (content.type || "").toUpperCase() === "PDF" &&
                      typeof content.pdfUrl === "string" &&
                      content.pdfUrl.trim() !== ""
                  )
                  .map((content) => ({
                    id: content.id,
                    title:
                      ("name" in content && typeof content.name === "string"
                        ? content.name
                        : undefined) ||
                      ("title" in content && typeof content.title === "string"
                        ? content.title
                        : undefined) ||
                      "Untitled resource",
                    description:
                      "description" in content &&
                      typeof content.description === "string"
                        ? content.description
                        : undefined,
                    pdfUrl: content.pdfUrl as string,
                  }));

                const assignments = topic.assignments || [];

                if (
                  lessons.length === 0 &&
                  resources.length === 0 &&
                  assignments.length === 0
                ) {
                  return null;
                }

                const lessonItems: LessonItem[] = lessons.map((lesson) => ({
                  id: lesson.id,
                  name:
                    "name" in lesson && typeof lesson.name === "string"
                      ? lesson.name
                      : undefined,
                  title:
                    "title" in lesson && typeof lesson.title === "string"
                      ? lesson.title
                      : undefined,
                  type: lesson.type,
                  videoDuration:
                    "videoDuration" in lesson &&
                    typeof lesson.videoDuration === "number"
                      ? lesson.videoDuration
                      : null,
                  isCompleted:
                    "isCompleted" in lesson ? Boolean(lesson.isCompleted) : false,
                }));

                return {
                  id: topic.id,
                  name: topic.name,
                  assignments,
                  contents: lessonItems,
                  resources,
                };
              })
              .filter((topic): topic is TopicWithResources => topic !== null);

            if (topics.length === 0) {
              return null;
            }

            return {
              id: chapter.id,
              name: chapter.name,
              topics,
            };
          })
          .filter(
            (chapter): chapter is ChapterWithResources => chapter !== null
          );

        if (chapters.length === 0) {
          return null;
        }

        return {
          id: subject.id,
          name: subject.name,
          chapters,
        };
      })
      .filter((subject): subject is SubjectWithResources => subject !== null);
  }, [currentTopicContentMap, currentTopicId, hierarchy]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredHierarchy = useMemo(() => {
    if (!normalizedSearch) {
      return lessonsHierarchy;
    }

    return lessonsHierarchy
      .map((subject) => {
        const subjectMatches = subject.name.toLowerCase().includes(normalizedSearch);

        const chapters = subject.chapters
          .map((chapter) => {
            const chapterMatches = chapter.name
              .toLowerCase()
              .includes(normalizedSearch);

            const topics = chapter.topics
              .map((topic) => {
                const topicMatches = topic.name
                  .toLowerCase()
                  .includes(normalizedSearch);
                const matchingLessons = topic.contents.filter((content) =>
                  (content.name || content.title || "")
                    .toLowerCase()
                    .includes(normalizedSearch)
                );
                const matchingResources = topic.resources.filter((resource) =>
                  `${resource.title} ${resource.description || ""}`
                    .toLowerCase()
                    .includes(normalizedSearch)
                );
                const matchingAssignments = topic.assignments.filter((assignment) =>
                  `${assignment.title} ${assignment.description || ""}`
                    .toLowerCase()
                    .includes(normalizedSearch)
                );

                if (
                  subjectMatches ||
                  chapterMatches ||
                  topicMatches ||
                  matchingLessons.length > 0 ||
                  matchingResources.length > 0 ||
                  matchingAssignments.length > 0
                ) {
                  return {
                    ...topic,
                    contents:
                      subjectMatches || chapterMatches || topicMatches
                        ? topic.contents
                        : matchingLessons,
                    resources:
                      subjectMatches || chapterMatches || topicMatches
                        ? topic.resources
                        : matchingResources,
                    assignments:
                      subjectMatches || chapterMatches || topicMatches
                        ? topic.assignments
                        : matchingAssignments,
                  };
                }

                return null;
              })
              .filter((topic): topic is TopicWithResources => Boolean(topic));

            if (subjectMatches || chapterMatches || topics.length > 0) {
              return {
                ...chapter,
                topics: subjectMatches || chapterMatches ? chapter.topics : topics,
              };
            }

            return null;
          })
          .filter((chapter): chapter is ChapterWithResources => Boolean(chapter));

        if (subjectMatches || chapters.length > 0) {
          return {
            ...subject,
            chapters: subjectMatches ? subject.chapters : chapters,
          };
        }

        return null;
      })
      .filter((subject): subject is SubjectWithResources => Boolean(subject));
  }, [lessonsHierarchy, normalizedSearch]);

  const totalLessonItems = useMemo(
    () =>
      lessonsHierarchy.reduce(
        (total, subject) =>
          total +
          subject.chapters.reduce(
            (chapterTotal, chapter) =>
              chapterTotal +
              chapter.topics.reduce(
                (topicTotal, topic) => topicTotal + topic.contents.length,
                0
              ),
            0
          ),
        0
      ) + (introVideo ? 1 : 0),
    [introVideo, lessonsHierarchy]
  );

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    setExpandedSubjects((current) =>
      Array.from(new Set([...current, currentSubjectId]))
    );
    setExpandedChapters((current) =>
      Array.from(new Set([...current, currentChapterId]))
    );
    setExpandedTopics((current) =>
      Array.from(new Set([...current, currentTopicId]))
    );
  }, [currentChapterId, currentSubjectId, currentTopicId, sidebarOpen]);

  useEffect(() => {
    if (!normalizedSearch) {
      return;
    }

    setExpandedSubjects(filteredHierarchy.map((subject) => subject.id));
    setExpandedChapters(
      filteredHierarchy.flatMap((subject) =>
        subject.chapters.map((chapter) => chapter.id)
      )
    );
    setExpandedTopics(
      filteredHierarchy.flatMap((subject) =>
        subject.chapters.flatMap((chapter) =>
          chapter.topics.map((topic) => topic.id)
        )
      )
    );
  }, [filteredHierarchy, normalizedSearch]);

  const toggleExpanded = (
    id: string,
    expandedItems: string[],
    setExpandedItems: Dispatch<SetStateAction<string[]>>
  ) => {
    setExpandedItems((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  return (
    <>
      {sidebarOpen && (
        <div className="space-y-4 border-b border-border/60 p-5 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FolderTree className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">Course Content</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                {totalLessonItems} lessons
              </Badge>
              {onClose && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search lessons..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10 pl-9 pr-9 text-sm rounded-xl bg-muted/30 border-border focus:ring-primary/30"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => onSearchChange("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {sidebarOpen && (
        <ScrollArea
          type="always"
          className="course-player-sidebar-scroll min-h-0 flex-1"
        >
          <div className="py-2">
            {introVideo ? (
              <div className="border-b border-border/40 px-3 pb-3">
                <Link
                  href={introVideo.href}
                  className={cn(
                    "group flex items-start gap-3 rounded-2xl px-4 py-3 text-[13px] transition-colors relative",
                    currentContentId === introVideo.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {currentContentId === introVideo.id ? (
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-primary" />
                  ) : null}
                  <div className="mt-[3px] shrink-0">
                    <Video
                      className={cn(
                        "h-4 w-4",
                        currentContentId === introVideo.id
                          ? "text-primary"
                          : "text-muted-foreground/70"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "line-clamp-2 leading-relaxed",
                        currentContentId === introVideo.id
                          ? "text-primary font-semibold"
                          : ""
                      )}
                    >
                      {introVideo.title}
                    </div>
                    <div className="mt-1 text-[11px] opacity-80">
                      Introduction
                    </div>
                  </div>
                </Link>
              </div>
            ) : null}
            {filteredHierarchy.map((subject, subjectIndex) => {
              const subjectExpanded = expandedSubjects.includes(subject.id);
              const subjectContentCount = subject.chapters.reduce(
                (total, chapter) =>
                  total +
                  chapter.topics.reduce(
                    (topicTotal, topic) => topicTotal + topic.contents.length,
                    0
                  ),
                0
              );

              return (
                <div key={subject.id} className="border-b border-border/40 last:border-0">
                  {/* Subject Header */}
                  <button
                    type="button"
                    onClick={() =>
                      toggleExpanded(
                        subject.id,
                        expandedSubjects,
                        setExpandedSubjects
                      )
                    }
                    className={cn(
                      "flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40",
                      subject.id === currentSubjectId && "bg-primary/5"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">
                        Section {subjectIndex + 1}: {subject.name}
                      </div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3" />
                        {subjectContentCount} lessons
                      </div>
                    </div>
                    {subjectExpanded ? (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {/* Chapters */}
                  {subjectExpanded && (
                    <div className="pb-2">
                      {subject.chapters.map((chapter, chapterIndex) => {
                        const chapterExpanded = expandedChapters.includes(chapter.id);
                        
                        return (
                          <div key={chapter.id} className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                toggleExpanded(
                                  chapter.id,
                                  expandedChapters,
                                  setExpandedChapters
                                )
                              }
                              className={cn(
                                "flex w-full items-center justify-between gap-3 px-5 py-2.5 pl-8 text-left transition-colors hover:bg-muted/40",
                                chapter.id === currentChapterId && "text-primary"
                              )}
                            >
                              <div className="text-sm font-semibold truncate text-foreground">
                                {chapter.name}
                              </div>
                              {chapterExpanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                            </button>

                            {/* Topics */}
                            {chapterExpanded && (
                              <div className="pb-1">
                                {chapter.topics.map((topic) => {
                                  const topicExpanded = expandedTopics.includes(topic.id);

                                  return (
                                    <div key={topic.id}>
                                      <div className={cn(
                                        "flex items-center justify-between gap-2 px-5 py-2 pl-11 transition-colors hover:bg-muted/40",
                                        topic.id === currentTopicId && "bg-primary/5"
                                      )}>
                                        <button
                                          type="button"
                                          onClick={() => toggleExpanded(topic.id, expandedTopics, setExpandedTopics)}
                                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                        >
                                          {topicExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                          )}
                                          <div className="truncate text-[13px] font-medium text-foreground">
                                            {topic.name}
                                          </div>
                                        </button>
                                        
                                        {topic.resources.length > 0 && (
                                          <TopicResourcesDropdown
                                            resources={topic.resources}
                                            topicName={topic.name}
                                          />
                                        )}
                                      </div>

                                      {/* Contents / Lessons */}
                                      {topicExpanded && (
                                        <div className="py-1">
                                          {topic.contents.length > 0 ? (
                                            topic.contents.map((content) => {
                                              const isCurrent = content.id === currentContentId;
                                              const contentName = content.name || content.title || "Untitled lesson";

                                              return (
                                                <Link
                                                  key={content.id}
                                                  ref={isCurrent ? currentContentRef : null}
                                                  href={resolveContentHref({
                                                    batchId,
                                                    subjectId: subject.id,
                                                    chapterId: chapter.id,
                                                    topicId: topic.id,
                                                    contentId: content.id,
                                                  })}
                                                  className={cn(
                                                    "group flex items-start gap-3 px-5 py-2.5 pl-14 text-[13px] transition-colors relative",
                                                    isCurrent
                                                      ? "bg-primary/10 text-primary font-medium"
                                                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                                                  )}
                                                >
                                                  {isCurrent && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                                                  )}
                                                  <div className="mt-[3px] shrink-0">
                                                    {content.isCompleted ? (
                                                      <CheckCircle2 className={cn("h-4 w-4", isCurrent ? "text-primary" : "text-green-600")} />
                                                    ) : content.type === "MARKDOWN" ? (
                                                      <BookOpen className={cn("h-4 w-4", isCurrent ? "text-primary" : "text-muted-foreground/70")} />
                                                    ) : content.type === "URL" ? (
                                                      <FileText className={cn("h-4 w-4", isCurrent ? "text-primary" : "text-muted-foreground/70")} />
                                                    ) : (
                                                      <Video className={cn("h-4 w-4", isCurrent ? "text-primary" : "text-muted-foreground/70")} />
                                                    )}
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                    <div className={cn("line-clamp-2 leading-relaxed", isCurrent ? "text-primary font-semibold" : "")}>
                                                      {contentName}
                                                    </div>
                                                    {content.videoDuration ? (
                                                      <div className="mt-1 text-[11px] opacity-80 flex items-center gap-1">
                                                        <Video className="h-3 w-3" />
                                                        {formatDuration(content.videoDuration)}
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                </Link>
                                              );
                                            })
                                          ) : (
                                            <div className="px-5 py-2 pl-14 text-[12px] text-muted-foreground italic">
                                              No lessons available.
                                            </div>
                                          )}
                                          {topic.assignments.map((assignment) => (
                                            <Link
                                              key={assignment.id}
                                              href={`/student/assignments/${assignment.id}`}
                                              className="group flex items-start gap-3 px-5 py-2.5 pl-14 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                                            >
                                              <ClipboardList className="mt-[3px] h-4 w-4 shrink-0 text-muted-foreground/70" />
                                              <div className="min-w-0 flex-1">
                                                <div className="line-clamp-2 leading-relaxed">
                                                  {assignment.title}
                                                </div>
                                                <div className="mt-1 text-[11px] opacity-80">
                                                  {assignment._count?.questions ?? 0} questions
                                                </div>
                                              </div>
                                            </Link>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredHierarchy.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No matching lessons or topic resources found.
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      <style jsx global>{`
        .course-player-sidebar-scroll
          [data-slot="scroll-area-scrollbar"][data-orientation="vertical"] {
          width: 12px;
          padding: 2px;
          opacity: 1;
        }

        .course-player-sidebar-scroll [data-slot="scroll-area-thumb"] {
          background-color: hsl(var(--primary) / 0.32);
        }

        .course-player-sidebar-scroll [data-slot="scroll-area-viewport"] > div {
          min-width: 100%;
        }

        .course-player-sidebar-scroll
          [data-slot="scroll-area-scrollbar"]:hover
          [data-slot="scroll-area-thumb"] {
          background-color: hsl(var(--primary) / 0.5);
        }
      `}</style>
    </>
  );
}

function TopicResourcesDropdown({
  resources,
  topicName,
}: {
  resources: TopicResourceItem[];
  topicName: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative h-7 w-7 shrink-0 rounded-full p-0"
          onClick={(event) => event.stopPropagation()}
          aria-label={`Open ${resources.length} resources for ${topicName}`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold leading-none text-primary-foreground">
            {resources.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-2 py-1.5">
          <div className="text-sm font-medium">Topic Resources</div>
          <div className="text-xs text-muted-foreground truncate">
            {topicName}
          </div>
        </div>
        <div className="my-1 h-px bg-border" />
        <div className="space-y-1">
          {resources.map((resource) => (
            <a
              key={resource.id}
              href={resource.pdfUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="block rounded-sm px-2 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {resource.title}
                  </div>
                  {resource.description ? (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {resource.description}
                    </div>
                  ) : null}
                </div>
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </a>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
