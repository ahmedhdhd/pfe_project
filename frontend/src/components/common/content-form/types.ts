import type { ContentBlockDocument } from "@/lib/content-blocks";

export enum ContentType {
  LECTURE = "Lecture",
  PDF = "PDF",
  MARKDOWN = "MARKDOWN",
  URL = "URL",
}

export enum VideoType {
  YOUTUBE = "YOUTUBE",
  HLS = "HLS",
}

export interface ContentFormData {
  name: string;
  description: string;
  aiSummary?: string;
  type: ContentType;
  pdfUrl: string;
  markdownBody: string;
  externalUrl: string;
  externalProvider: string;
  videoUrl: string;
  videoType: VideoType;
  videoThumbnail: string;
  videoDuration: number;
}

export interface ContentFormFiles {
  pdfFile: string;
  videoFile: string;
  thumbnailFile: string;
}

export interface ContentData {
  name: string;
  title?: string;
  description?: string;
  aiSummary?: string;
  topicId?: string;
  body?: ContentBlockDocument | null;
  type: ContentType;
  pdfUrl?: string;
  markdownBody?: string;
  externalUrl?: string;
  externalProvider?: string;
  videoUrl?: string;
  videoType?: VideoType;
  videoThumbnail?: string;
  videoDuration?: number;
}

export interface Content {
  id: string;
  name: string;
  description?: string;
  aiSummary?: string;
  topicId: string;
  body?: ContentBlockDocument | null;
  type: ContentType;
  pdfUrl?: string;
  markdownBody?: string;
  externalUrl?: string;
  externalProvider?: string;
  videoUrl?: string;
  videoType?: VideoType;
  videoThumbnail?: string;
  videoDuration?: number;
  isCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_FORM_DATA: ContentFormData = {
  name: "",
  description: "",
  aiSummary: "",
  type: ContentType.LECTURE,
  pdfUrl: "",
  markdownBody: "",
  externalUrl: "",
  externalProvider: "",
  videoUrl: "",
  videoType: VideoType.YOUTUBE,
  videoThumbnail: "",
  videoDuration: 0,
};

export const DEFAULT_FORM_FILES: ContentFormFiles = {
  pdfFile: "",
  videoFile: "",
  thumbnailFile: "",
};
