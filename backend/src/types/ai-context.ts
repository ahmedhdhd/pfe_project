/** Lesson context assembled by Express for the AI tutor (no LLM logic here). */
export interface SystemPromptContext {
  batch: {
    name: string;
    exam?: string | null;
    class?: string | null;
    language?: string | null;
  };
  chapter: { title: string; order: number; totalChapters: number };
  topic: { title: string };
  content: {
    title: string;
    type: string;
    description?: string | null;
    extractedText?: string | null;
    markdownBody?: string | null;
    externalUrl?: string | null;
    videoUrl?: string | null;
  };
  siblingTopics: Array<{ title: string; description?: string | null }>;
  allChapters: Array<{ title: string }>;
  student: { firstName: string };
}
