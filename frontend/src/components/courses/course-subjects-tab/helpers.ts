import type { AiPlayground } from "@/lib/types/api";
import type {
  HierarchyChapter,
  HierarchyContent,
  HierarchyTopic,
  Selection,
} from "./types";

export function findPlaygroundForScope(
  playgrounds: AiPlayground[],
  topicId: string,
  contentId?: string | null
): AiPlayground | null {
  if (contentId) {
    return playgrounds.find((p) => p.contentId === contentId) ?? null;
  }
  return (
    playgrounds.find((p) => p.topicId === topicId && !p.contentId) ?? null
  );
}

export function getChapterOutlineCounts(hierarchy: HierarchyChapter[]) {
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

export function getDefaultOutlineSelection(
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

export function isOutlineSelectionValid(
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

export function findOutlineSelectionNodes(
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

export function getContentName(content: HierarchyContent) {
  return content.name || content.title || "Untitled content";
}
