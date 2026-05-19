export interface CourseHierarchyContent {
  id: string;
  name?: string;
  title?: string;
  description?: string | null;
  type?: string;
  pdfUrl?: string | null;
  markdownBody?: string | null;
  externalUrl?: string | null;
  externalProvider?: string | null;
  videoUrl?: string | null;
  videoType?: string | null;
  videoThumbnail?: string | null;
  videoDuration?: number | null;
}

export interface CourseHierarchyTopic {
  id: string;
  name: string;
  description?: string | null;
  quiz?: {
    title?: string;
    passingPercentage?: number;
    questions?: unknown[];
  } | null;
  latestQuizAttempt?: {
    id: string;
    percentage: number;
    isPassed: boolean;
  } | null;
  contents?: CourseHierarchyContent[];
  assignments?: Array<{
    id: string;
    title: string;
    description?: string | null;
    status?: string;
    _count?: { questions?: number; submissions?: number };
  }>;
}

export interface CourseHierarchyChapter {
  id: string;
  name: string;
  topics?: CourseHierarchyTopic[];
}

export interface CourseHierarchySubject {
  id: string;
  name: string;
  chapters?: CourseHierarchyChapter[];
}

export interface CourseOutlineChapter extends CourseHierarchyChapter {
  batchId?: string;
  legacySubjectId?: string | null;
  legacySubjectName?: string | null;
}

export interface CourseContentLocation {
  subjectId: string;
  subjectName: string;
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  contentId: string;
  content: CourseHierarchyContent;
}

export interface CourseOutlineContentLocation {
  chapterId: string;
  chapterName: string;
  topicId: string;
  topicName: string;
  contentId: string;
  content: CourseHierarchyContent;
  legacySubjectId?: string | null;
  legacySubjectName?: string | null;
}

export interface CourseResourceLocation extends CourseContentLocation {
  content: CourseHierarchyContent & {
    type: "PDF";
    pdfUrl: string;
  };
}

export interface CourseOutlineResourceLocation
  extends CourseOutlineContentLocation {
  content: CourseHierarchyContent & {
    type: "PDF";
    pdfUrl: string;
  };
}

export function isCourseHierarchyContentType(
  content: CourseHierarchyContent | undefined,
  type: string
): boolean {
  return (content?.type || "").toUpperCase() === type.toUpperCase();
}

export function flattenCourseHierarchy(
  hierarchy: CourseHierarchySubject[] | undefined
): CourseContentLocation[] {
  if (!Array.isArray(hierarchy)) return [];

  return hierarchy.flatMap((subject) =>
    (subject.chapters || []).flatMap((chapter) =>
      (chapter.topics || []).flatMap((topic) =>
        (topic.contents || []).map((content) => ({
          subjectId: subject.id,
          subjectName: subject.name,
          chapterId: chapter.id,
          chapterName: chapter.name,
          topicId: topic.id,
          topicName: topic.name,
          contentId: content.id,
          content,
        }))
      )
    )
  );
}

export function flattenCourseOutline(
  outline: CourseOutlineChapter[] | undefined
): CourseOutlineContentLocation[] {
  if (!Array.isArray(outline)) return [];

  return outline.flatMap((chapter) =>
    (chapter.topics || []).flatMap((topic) =>
      (topic.contents || []).map((content) => ({
        chapterId: chapter.id,
        chapterName: chapter.name,
        topicId: topic.id,
        topicName: topic.name,
        contentId: content.id,
        content,
        legacySubjectId: chapter.legacySubjectId ?? null,
        legacySubjectName: chapter.legacySubjectName ?? null,
      }))
    )
  );
}

export function flattenCourseHierarchyByType(
  hierarchy: CourseHierarchySubject[] | undefined,
  type: string
): CourseContentLocation[] {
  return flattenCourseHierarchy(hierarchy).filter((item) =>
    isCourseHierarchyContentType(item.content, type)
  );
}

export function flattenCourseOutlineByType(
  outline: CourseOutlineChapter[] | undefined,
  type: string
): CourseOutlineContentLocation[] {
  return flattenCourseOutline(outline).filter((item) =>
    isCourseHierarchyContentType(item.content, type)
  );
}

export function filterCourseHierarchyByContentType(
  hierarchy: CourseHierarchySubject[] | undefined,
  type: string
): CourseHierarchySubject[] {
  if (!Array.isArray(hierarchy)) return [];

  return hierarchy
    .map((subject) => {
      const chapters = (subject.chapters || [])
        .map((chapter) => {
          const topics = (chapter.topics || [])
            .map((topic) => ({
              ...topic,
              contents: (topic.contents || []).filter((content) =>
                isCourseHierarchyContentType(content, type)
              ),
            }))
            .filter((topic) => (topic.contents || []).length > 0);

          return {
            ...chapter,
            topics,
          };
        })
        .filter((chapter) => (chapter.topics || []).length > 0);

      return {
        ...subject,
        chapters,
      };
    })
    .filter((subject) => (subject.chapters || []).length > 0);
}

export function filterCourseOutlineByContentType(
  outline: CourseOutlineChapter[] | undefined,
  type: string
): CourseOutlineChapter[] {
  if (!Array.isArray(outline)) return [];

  return outline
    .map((chapter) => {
      const topics = (chapter.topics || [])
        .map((topic) => ({
          ...topic,
          contents: (topic.contents || []).filter((content) =>
            isCourseHierarchyContentType(content, type)
          ),
        }))
        .filter((topic) => (topic.contents || []).length > 0);

      return {
        ...chapter,
        topics,
      };
    })
    .filter((chapter) => (chapter.topics || []).length > 0);
}

export function flattenCourseResources(
  hierarchy: CourseHierarchySubject[] | undefined
): CourseResourceLocation[] {
  return flattenCourseHierarchyByType(hierarchy, "PDF").filter(
    (item): item is CourseResourceLocation =>
      isCourseHierarchyContentType(item.content, "PDF") &&
      typeof item.content.pdfUrl === "string" &&
      item.content.pdfUrl.trim() !== ""
  );
}

export function flattenCourseOutlineResources(
  outline: CourseOutlineChapter[] | undefined
): CourseOutlineResourceLocation[] {
  return flattenCourseOutlineByType(outline, "PDF").filter(
    (item): item is CourseOutlineResourceLocation =>
      isCourseHierarchyContentType(item.content, "PDF") &&
      typeof item.content.pdfUrl === "string" &&
      item.content.pdfUrl.trim() !== ""
  );
}

export function buildStudentContentPath(
  batchId: string,
  location: Pick<
    CourseContentLocation,
    "subjectId" | "chapterId" | "topicId" | "contentId"
  >
): string {
  return `/student/batches/${batchId}/subjects/${location.subjectId}/chapters/${location.chapterId}/topics/${location.topicId}/content/${location.contentId}`;
}

export function buildStudentChapterContentPath(
  batchId: string,
  location: Pick<
    CourseOutlineContentLocation,
    "chapterId" | "topicId" | "contentId"
  >
): string {
  return `/student/batches/${batchId}/chapters/${location.chapterId}/topics/${location.topicId}/content/${location.contentId}`;
}

export function getFirstCourseContentLocation(
  hierarchy: CourseHierarchySubject[] | undefined
): CourseContentLocation | null {
  const contents = flattenCourseHierarchy(hierarchy);
  return contents[0] || null;
}

export function getFirstCourseOutlineContentLocation(
  outline: CourseOutlineChapter[] | undefined
): CourseOutlineContentLocation | null {
  const contents = flattenCourseOutline(outline);
  return contents[0] || null;
}

export function getFirstCourseLessonLocation(
  hierarchy: CourseHierarchySubject[] | undefined
): CourseContentLocation | null {
  const contents = flattenCourseHierarchyByType(hierarchy, "Lecture");
  return contents[0] || null;
}

export function getFirstCourseOutlineLessonLocation(
  outline: CourseOutlineChapter[] | undefined
): CourseOutlineContentLocation | null {
  const contents = flattenCourseOutlineByType(outline, "Lecture");
  return contents[0] || null;
}
