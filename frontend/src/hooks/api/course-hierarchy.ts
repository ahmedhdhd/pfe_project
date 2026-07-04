// Shared course-hierarchy payload helpers used by the subject/topic/content hooks.
"use client";

import type { TopicQuiz } from "./topic";

const normalizeContentItem = <T extends Record<string, unknown>>(content: T) => ({
  ...content,
  name:
    typeof content.name === "string" && content.name.trim() !== ""
      ? content.name
      : typeof content.title === "string"
      ? content.title
      : "",
});

const normalizeContentPayload = <T extends { data?: unknown }>(payload: T): T => {
  if (!payload || typeof payload !== "object" || !("data" in payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return {
      ...payload,
      data: payload.data.map((item) =>
        item && typeof item === "object"
          ? normalizeContentItem(item as Record<string, unknown>)
          : item
      ),
    } as T;
  }

  if (payload.data && typeof payload.data === "object") {
    return {
      ...payload,
      data: normalizeContentItem(payload.data as Record<string, unknown>),
    } as T;
  }

  return payload;
};

const normalizeCourseHierarchyPayload = <T extends { data?: unknown }>(
  payload: T
): T => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    return payload;
  }

  return {
    ...payload,
    data: payload.data.map((subject) => {
      if (!subject || typeof subject !== "object") {
        return subject;
      }

      const subjectRecord = subject as Record<string, unknown>;

      return {
        ...subjectRecord,
        chapters: Array.isArray(subjectRecord.chapters)
          ? subjectRecord.chapters.map((chapter) => {
              if (!chapter || typeof chapter !== "object") {
                return chapter;
              }

              const chapterRecord = chapter as Record<string, unknown>;

              return {
                ...chapterRecord,
                topics: Array.isArray(chapterRecord.topics)
                  ? chapterRecord.topics.map((topic) => {
                      if (!topic || typeof topic !== "object") {
                        return topic;
                      }

                      const topicRecord = topic as Record<string, unknown>;

                      return {
                        ...topicRecord,
                        contents: Array.isArray(topicRecord.contents)
                          ? topicRecord.contents.map((content) =>
                              content && typeof content === "object"
                                ? normalizeContentItem(
                                    content as Record<string, unknown>
                                  )
                                : content
                            )
                          : [],
                      };
                    })
                  : [],
              };
            })
          : [],
      };
    }),
  } as T;
};

const normalizeCourseOutlinePayload = <T extends { data?: unknown }>(
  payload: T
): T => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    return payload;
  }

  return {
    ...payload,
    data: payload.data.map((chapter) => {
      if (!chapter || typeof chapter !== "object") {
        return chapter;
      }

      const chapterRecord = chapter as Record<string, unknown>;

      return {
        ...chapterRecord,
        topics: Array.isArray(chapterRecord.topics)
          ? chapterRecord.topics.map((topic) => {
              if (!topic || typeof topic !== "object") {
                return topic;
              }

              const topicRecord = topic as Record<string, unknown>;

              return {
                ...topicRecord,
                contents: Array.isArray(topicRecord.contents)
                  ? topicRecord.contents.map((content) =>
                      content && typeof content === "object"
                        ? normalizeContentItem(content as Record<string, unknown>)
                        : content
                    )
                  : [],
              };
            })
          : [],
      };
    }),
  } as T;
};

const patchTopicQuizInHierarchyNode = (
  node: unknown,
  topicId: string,
  quiz: TopicQuiz | null
): unknown => {
  if (!node || typeof node !== "object") {
    return node;
  }

  const record = node as Record<string, unknown>;

  if (record.id === topicId && Array.isArray(record.contents)) {
    return {
      ...record,
      quiz,
    };
  }

  if (Array.isArray(record.topics)) {
    return {
      ...record,
      topics: record.topics.map((topic) =>
        patchTopicQuizInHierarchyNode(topic, topicId, quiz)
      ),
    };
  }

  if (Array.isArray(record.chapters)) {
    return {
      ...record,
      chapters: record.chapters.map((chapter) =>
        patchTopicQuizInHierarchyNode(chapter, topicId, quiz)
      ),
    };
  }

  return record;
};

const patchTopicQuizInHierarchyPayload = <T extends { data?: unknown }>(
  payload: T,
  topicId: string,
  quiz: TopicQuiz | null
): T => {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.data)) {
    return payload;
  }

  return {
    ...payload,
    data: payload.data.map((item) =>
      patchTopicQuizInHierarchyNode(item, topicId, quiz)
    ),
  } as T;
};

export {
  normalizeContentPayload,
  normalizeCourseHierarchyPayload,
  normalizeCourseOutlinePayload,
  patchTopicQuizInHierarchyPayload,
};
