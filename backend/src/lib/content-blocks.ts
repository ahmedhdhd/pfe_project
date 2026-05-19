export type ContentBlockId = string;

export interface ContentBlockDocument {
  version: 1;
  blocks: ContentBlock[];
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | BulletListBlock
  | NumberedListBlock
  | CalloutBlock
  | ImageBlock
  | VideoBlock
  | PdfBlock
  | QuizBlock
  | CodeBlock
  | DividerBlock;

interface BaseContentBlock {
  id: ContentBlockId;
  type: string;
}

export interface ParagraphBlock extends BaseContentBlock {
  type: "paragraph";
  content: string;
}

export interface HeadingBlock extends BaseContentBlock {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
}

export interface BulletListBlock extends BaseContentBlock {
  type: "bullet_list";
  items: string[];
}

export interface NumberedListBlock extends BaseContentBlock {
  type: "numbered_list";
  items: string[];
}

export interface CalloutBlock extends BaseContentBlock {
  type: "callout";
  variant: "info" | "warning" | "success";
  content: string;
  title?: string;
}

export interface ImageBlock extends BaseContentBlock {
  type: "image";
  url: string;
  caption?: string;
  alt?: string;
}

export interface VideoBlock extends BaseContentBlock {
  type: "video";
  url: string;
  provider?: "upload" | "youtube" | "hls";
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface PdfBlock extends BaseContentBlock {
  type: "pdf";
  url: string;
  title?: string;
  description?: string;
}

export interface QuizBlock extends BaseContentBlock {
  type: "quiz";
  quizId?: string;
  title?: string;
}

export interface CodeBlock extends BaseContentBlock {
  type: "code";
  language?: string;
  content: string;
}

export interface DividerBlock extends BaseContentBlock {
  type: "divider";
}

export const EMPTY_CONTENT_BLOCK_DOCUMENT: ContentBlockDocument = {
  version: 1,
  blocks: [],
};
