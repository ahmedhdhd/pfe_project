"use client";

import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { PanelLeftOpen } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type Player from "video.js/dist/types/player";
import {
  useGetClientTopic,
  useGetClientChapter,
  useGetClientContentsByTopic,
  useGetClientCourseHierarchy,
} from "@/hooks";
import { useVideoProgress } from "@/hooks/use-video-progress";
import { ContentPlayerHeader } from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/components/content-player-header";
import { ContentPlayerSidebar } from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/components/content-player-sidebar";
import { VideoPlayerWrapper } from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/components/video-player-wrapper";
import { AiSidebar } from "@/components/student/ai-sidebar/AiSidebar";
import { CoursePlayerTabs } from "@/components/student/course/course-player-tabs";
import { useGetExploreBatch } from "@/hooks";
import {
  type Content,
  type Chapter,
} from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/utils/content-player-utils";
import {
  buildStudentChapterContentPath,
  flattenCourseOutlineByType,
  type CourseHierarchySubject,
  type CourseOutlineChapter,
} from "@/lib/course-navigation";
import "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/video-player.css";

export default function ChapterContentPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;
  const contentId = params.contentId as string;

  const [playerInstance, setPlayerInstance] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiSidebarWidth, setAiSidebarWidth] = useState(380);

  const currentContentRef = useRef<HTMLAnchorElement | null>(null);
  const cleanupHandlersRef = useRef<(() => void) | null>(null);

  const {
    isCompleted,
    handleMarkAsComplete,
    setupPlayerHandlers,
    handleTimeUpdate,
    handleVideoEnded,
    isMarkingComplete,
    cleanup: cleanupProgress,
  } = useVideoProgress({
    contentId,
  });

  const { data: topicResponse } = useGetClientTopic(topicId);
  const { data: contentsResponse } = useGetClientContentsByTopic(topicId);
  const { data: chapterResponse } = useGetClientChapter(chapterId);
  const { data: hierarchyResponse } = useGetClientCourseHierarchy(batchId);
  const { data: batchResponse } = useGetExploreBatch(batchId);

  const topic = topicResponse?.data || topicResponse;
  const contents: Content[] = contentsResponse?.data || [];
  const chapter = chapterResponse?.data || chapterResponse;
  const hierarchy =
    (hierarchyResponse?.data as CourseHierarchySubject[] | undefined) || [];
  const courseData = batchResponse?.data || {};
  const introVideo =
    typeof courseData?.introVideoUrl === "string" &&
    courseData.introVideoUrl.trim() !== ""
      ? {
          id: "course-introduction",
          title: "Course Introduction",
          href: `/student/batches/${batchId}/intro`,
        }
      : null;

  const allChapters = useMemo(() => {
    return hierarchy.flatMap(subject => 
      (subject.chapters || []).map(ch => ({
        id: ch.id,
        name: ch.name,
        subjectId: subject.id,
        courseId: batchId,
        topics: ch.topics.map(t => ({
          id: t.id,
          name: t.name,
          chapterId: ch.id,
          subjectId: subject.id,
          contents: t.contents.map((c: any) => ({
            id: c.id,
            name: c.name || c.title,
            type: c.type,
            isCompleted: c.isCompleted,
            videoDuration: c.videoDuration
          }))
        }))
      }))
    );
  }, [hierarchy, batchId]);

  const handleContentSelect = (content: any) => {
    for (const chapter of allChapters) {
      for (const topic of chapter.topics) {
        if (topic.contents.some(c => c.id === content.id)) {
          router.push(`/student/batches/${batchId}/chapters/${chapter.id}/topics/${topic.id}/content/${content.id}`);
          return;
        }
      }
    }
  };

  const outline = useMemo<CourseOutlineChapter[]>(
    () =>
      hierarchy.flatMap((subject) =>
        (subject.chapters || []).map((item) => ({
          ...item,
          legacySubjectId: subject.id,
          legacySubjectName: subject.name,
        }))
      ),
    [hierarchy]
  );

  const currentChapterMeta = useMemo(
    () => outline.find((item) => item.id === chapterId) || null,
    [chapterId, outline]
  );

  const currentSubjectId = currentChapterMeta?.legacySubjectId || "";

  const currentContent = contents.find((c) => c.id === contentId);

  useEffect(() => {
    if (currentContentRef.current) {
      setTimeout(() => {
        currentContentRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 300);
    }
  }, [contentId]);

  useEffect(() => {
    return () => {
      if (cleanupHandlersRef.current) {
        cleanupHandlersRef.current();
        cleanupHandlersRef.current = null;
      }
      cleanupProgress();
    };
  }, [contentId, cleanupProgress]);

  const allContents = useMemo(() => {
    const courseContents = flattenCourseOutlineByType(outline, "Lecture");
    if (courseContents.length > 0) {
      return courseContents;
    }

    return contents
      .filter((content) => content.type === "Lecture")
      .map((content) => ({
        chapterId,
        chapterName: chapter?.name || "",
        topicId,
        topicName: topic?.name || "",
        contentId: content.id,
        content,
        legacySubjectId: currentSubjectId || null,
        legacySubjectName: currentChapterMeta?.legacySubjectName || null,
      }));
  }, [
    chapter?.name,
    chapterId,
    contents,
    currentChapterMeta?.legacySubjectName,
    currentSubjectId,
    outline,
    topic?.name,
    topicId,
  ]);

  const currentIndex = allContents.findIndex((item) => item.contentId === contentId);
  const nextContent =
    currentIndex < allContents.length - 1
      ? allContents[currentIndex + 1]
      : null;

  const handleGoBack = () => {
    router.push(`/student/batches/${batchId}`);
  };

  const handlePlayerReady = (player: Player) => {
    setPlayerInstance(player);
    if (cleanupHandlersRef.current) {
      cleanupHandlersRef.current();
    }
    cleanupHandlersRef.current = setupPlayerHandlers(player);
  };

  const handleTimeUpdateCallback = (currentTime: number) => {
    handleTimeUpdate(currentTime, playerInstance);
  };

  const handleVideoEndedCallback = () => {
    handleVideoEnded();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const previousContent =
        currentIndex > 0 ? allContents[currentIndex - 1] : null;

      if (e.key === "ArrowLeft" && previousContent) {
        e.preventDefault();
        router.push(buildStudentChapterContentPath(batchId, previousContent));
      } else if (e.key === "ArrowRight" && nextContent) {
        e.preventDefault();
        router.push(buildStudentChapterContentPath(batchId, nextContent));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [allContents, batchId, currentIndex, nextContent, router]);

  if (!currentContent) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Content not found</h2>
            <Button onClick={handleGoBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <ContentPlayerHeader
        contentName={currentContent.name}
        contentDescription={currentContent.description}
        chapterName={chapter?.name}
        topicName={topic?.name}
        isCompleted={isCompleted}
        isMarkingComplete={isMarkingComplete}
        onGoBack={handleGoBack}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onMarkAsComplete={handleMarkAsComplete}
        sidebarOpen={sidebarOpen}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        isAiOpen={isAiOpen}
      />

      <div 
        className="flex-1 flex overflow-hidden relative transition-all duration-300 ease-in-out"
      >
        <div className="flex-1 flex flex-col overflow-y-auto relative min-w-0">
          <div className="w-full shrink-0 aspect-video md:min-h-[60vh] max-h-[85vh]">
            <VideoPlayerWrapper
              content={currentContent}
              playerInstance={playerInstance}
              onPlayerReady={handlePlayerReady}
              onTimeUpdate={handleTimeUpdateCallback}
              onEnded={handleVideoEndedCallback}
            />
          </div>
          <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto w-full shrink-0">
            <CoursePlayerTabs
              course={courseData}
              courseId={batchId}
              chapters={allChapters as any}
              onContentSelect={handleContentSelect}
            />
          </div>
        </div>

        {/* Right Panel Container (Desktop) */}
        <div 
          className="hidden lg:flex border-l bg-card shrink-0 flex-col overflow-hidden relative transition-all duration-300"
          style={{
            width: isAiOpen ? aiSidebarWidth : sidebarOpen ? 320 : 0,
            opacity: isAiOpen || sidebarOpen ? 1 : 0
          }}
        >
          {isAiOpen ? (
            <AiSidebar 
              batchId={batchId}
              chapterId={chapterId}
              topicId={topicId}
              contentId={contentId}
              contentName={currentContent.name}
              isOpen={isAiOpen}
              onClose={() => setIsAiOpen(false)}
              width={aiSidebarWidth}
              onWidthChange={setAiSidebarWidth}
            />
          ) : sidebarOpen ? (
            <ContentPlayerSidebar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              hierarchy={hierarchy}
              contents={contents}
              currentSubjectId={currentSubjectId}
              currentChapterId={chapterId}
              currentTopicId={topicId}
              currentContentId={contentId}
              batchId={batchId}
              introVideo={introVideo}
              sidebarOpen={sidebarOpen}
              currentContentRef={currentContentRef}
              buildContentHref={({ batchId, chapterId, topicId, contentId }) =>
                `/student/batches/${batchId}/chapters/${chapterId}/topics/${topicId}/content/${contentId}`
              }
              onClose={() => setSidebarOpen(false)}
            />
          ) : null}
        </div>
        
        {/* Mobile overlay version */}
        <AnimatePresence>
          {isAiOpen && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-0 z-50 flex flex-col bg-background"
            >
              <AiSidebar 
                batchId={batchId}
                chapterId={chapterId}
                topicId={topicId}
                contentId={contentId}
                contentName={currentContent.name}
                isOpen={isAiOpen}
                onClose={() => setIsAiOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            >
              <Button
                variant="default"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="rounded-full shadow-lg"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
