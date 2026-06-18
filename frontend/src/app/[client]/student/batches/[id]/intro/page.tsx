"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftOpen } from "@/components/icons";
import { useParams, useRouter } from "next/navigation";
import type Player from "video.js/dist/types/player";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContentPlayerHeader } from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/components/content-player-header";
import { ContentPlayerSidebar } from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/components/content-player-sidebar";
import { VideoPlayerWrapper } from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/components/video-player-wrapper";
import { AiSidebar } from "@/components/student/ai-sidebar/AiSidebar";
import { CoursePlayerTabs } from "@/components/student/course/course-player-tabs";
import { useGetClientCourseHierarchy, useGetExploreBatch } from "@/hooks";
import type { Content } from "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/utils/content-player-utils";
import {
  buildStudentChapterContentPath,
  getFirstCourseOutlineLessonLocation,
  type CourseHierarchySubject,
  type CourseOutlineChapter,
} from "@/lib/course-navigation";
import { stripHtmlToText } from "@/lib/utils";
import "@/app/[client]/student/batches/[id]/subjects/[subjectId]/chapters/[chapterId]/topics/[topicId]/content/[contentId]/video-player.css";

const INTRO_CONTENT_ID = "course-introduction";

export default function CourseIntroductionPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [playerInstance, setPlayerInstance] = useState<Player | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiSidebarWidth, setAiSidebarWidth] = useState(380);
  const currentContentRef = useRef<HTMLAnchorElement | null>(null);

  const { data: hierarchyResponse } = useGetClientCourseHierarchy(batchId);
  const { data: batchResponse } = useGetExploreBatch(batchId);

  const hierarchy =
    (hierarchyResponse?.data as CourseHierarchySubject[] | undefined) || [];
  const courseData = batchResponse?.data || {};

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

  const firstLessonLocation = getFirstCourseOutlineLessonLocation(outline);
  const introContent = useMemo<Content | null>(() => {
    if (
      !courseData ||
      typeof courseData !== "object" ||
      typeof courseData.introVideoUrl !== "string" ||
      !courseData.introVideoUrl.trim()
    ) {
      return null;
    }

    return {
      id: INTRO_CONTENT_ID,
      name: "Course Introduction",
      topicId: "course-introduction",
      type: "Lecture",
      videoUrl: courseData.introVideoUrl,
      videoType:
        typeof courseData.introVideoType === "string"
          ? (courseData.introVideoType as "YOUTUBE" | "HLS")
          : undefined,
      videoThumbnail:
        typeof courseData.imageUrl === "string" ? courseData.imageUrl : undefined,
      description:
        typeof courseData.description === "string"
          ? stripHtmlToText(courseData.description)
          : undefined,
    };
  }, [courseData]);

  const allChapters = useMemo(() => {
    return hierarchy.flatMap((subject) =>
      (subject.chapters || []).map((chapter) => ({
        id: chapter.id,
        name: chapter.name,
        subjectId: subject.id,
        courseId: batchId,
        topics: (chapter.topics || []).map((topic) => ({
          id: topic.id,
          name: topic.name,
          chapterId: chapter.id,
          subjectId: subject.id,
          contents: (topic.contents || []).map((content) => ({
            id: content.id,
            name: content.name || content.title,
            type: content.type,
            isCompleted: Boolean((content as { isCompleted?: boolean }).isCompleted),
            videoDuration:
              typeof content.videoDuration === "number"
                ? content.videoDuration
                : undefined,
          })),
        })),
      }))
    );
  }, [batchId, hierarchy]);

  const introVideoLink = introContent
    ? {
        id: INTRO_CONTENT_ID,
        title: "Course Introduction",
        href: `/student/batches/${batchId}/intro`,
      }
    : null;

  const handleContentSelect = (content: { id: string }) => {
    for (const chapter of allChapters) {
      for (const topic of chapter.topics) {
        if (topic.contents.some((item) => item.id === content.id)) {
          router.push(
            `/student/batches/${batchId}/chapters/${chapter.id}/topics/${topic.id}/content/${content.id}`
          );
          return;
        }
      }
    }
  };

  const handleGoBack = () => {
    router.push(`/student/batches/${batchId}`);
  };

  const handlePlayerReady = (player: Player) => {
    setPlayerInstance(player);
  };

  const handleVideoEnded = () => {
    if (!firstLessonLocation) {
      return;
    }

    router.push(buildStudentChapterContentPath(batchId, firstLessonLocation));
  };

  if (!introContent) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-10">
        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            <h2 className="text-2xl font-bold">Introduction video not found</h2>
            <p className="text-muted-foreground">
              This course does not have an introduction video yet.
            </p>
            <Button onClick={handleGoBack}>Back to course details</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <ContentPlayerHeader
        contentName={introContent.name}
        contentDescription={introContent.description}
        chapterName="Course"
        topicName="Introduction"
        isCompleted={false}
        isMarkingComplete={false}
        onGoBack={handleGoBack}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onMarkAsComplete={() => undefined}
        sidebarOpen={sidebarOpen}
        onToggleAi={() => setIsAiOpen(!isAiOpen)}
        isAiOpen={isAiOpen}
        showCompletionAction={false}
      />

      <div className="flex-1 flex overflow-hidden relative transition-all duration-300 ease-in-out">
        <div className="flex-1 flex flex-col overflow-y-auto relative min-w-0">
          <div className="w-full shrink-0 aspect-video md:min-h-[60vh] max-h-[85vh]">
            <VideoPlayerWrapper
              content={introContent}
              playerInstance={playerInstance}
              onPlayerReady={handlePlayerReady}
              onTimeUpdate={() => undefined}
              onEnded={handleVideoEnded}
            />
          </div>
          <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto w-full shrink-0">
            <CoursePlayerTabs
              course={courseData}
              courseId={batchId}
              chapters={allChapters as never[]}
              onContentSelect={handleContentSelect}
            />
          </div>
        </div>

        <div
          className="hidden lg:flex border-l bg-card shrink-0 flex-col overflow-hidden relative transition-all duration-300"
          style={{
            width: isAiOpen ? aiSidebarWidth : sidebarOpen ? 320 : 0,
            opacity: isAiOpen || sidebarOpen ? 1 : 0,
          }}
        >
          {isAiOpen ? (
            <AiSidebar
              batchId={batchId}
              chapterId=""
              topicId=""
              contentId={INTRO_CONTENT_ID}
              contentName={introContent.name}
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
              contents={[]}
              currentSubjectId=""
              currentChapterId=""
              currentTopicId=""
              currentContentId={INTRO_CONTENT_ID}
              batchId={batchId}
              introVideo={introVideoLink}
              sidebarOpen={sidebarOpen}
              currentContentRef={currentContentRef}
              buildContentHref={({ batchId, chapterId, topicId, contentId }) =>
                `/student/batches/${batchId}/chapters/${chapterId}/topics/${topicId}/content/${contentId}`
              }
              onClose={() => setSidebarOpen(false)}
            />
          ) : null}
        </div>

        <AnimatePresence>
          {isAiOpen ? (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-0 z-50 flex flex-col bg-background"
            >
              <AiSidebar
                batchId={batchId}
                chapterId=""
                topicId=""
                contentId={INTRO_CONTENT_ID}
                contentName={introContent.name}
                isOpen={isAiOpen}
                onClose={() => setIsAiOpen(false)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {!sidebarOpen ? (
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
