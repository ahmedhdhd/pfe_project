"use client";

import type { ContentType, VideoType } from "@/components/common/content-form";
import type { TopicQuiz, TopicQuizAttemptSummary } from "@/hooks/api";
import type { Subject } from "../types";

export interface HierarchyContent {
  id: string;
  topicId: string;
  title?: string;
  name?: string;
  type: ContentType;
  playgroundId?: string;
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

export interface HierarchyTopic {
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

export interface HierarchyChapter {
  id: string;
  name: string;
  legacySubjectId?: string | null;
  legacySubjectName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  topics: HierarchyTopic[];
}

export interface HierarchySubject extends Subject {
  chapters: HierarchyChapter[];
}

export type Selection =
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

export type DeleteTarget =
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
