import {
  ContentFormData,
  ContentFormFiles,
  ContentData,
  Content,
  VideoType,
  ContentType,
} from "./types";
import { normalizeExternalUrl } from "@/lib/utils/external-resource";

function isYouTubeUrl(value?: string | null): boolean {
  if (!value) return false;
  return /youtu\.be|youtube\.com/i.test(value);
}

function isHlsUrl(value?: string | null): boolean {
  if (!value) return false;
  return /\.m3u8($|[?#])/i.test(value);
}

export function inferVideoTypeFromUrl(
  videoUrl?: string | null
): VideoType | undefined {
  if (!videoUrl) return undefined;
  if (isYouTubeUrl(videoUrl)) return VideoType.YOUTUBE;
  if (isHlsUrl(videoUrl)) return VideoType.HLS;
  return undefined;
}

export function resolveVideoTypeForStorage(
  selectedVideoType?: string | null,
  videoUrl?: string | null
): VideoType | undefined {
  const inferred = inferVideoTypeFromUrl(videoUrl);
  if (inferred) return inferred;

  if (!selectedVideoType) return undefined;

  const normalized = selectedVideoType.toUpperCase();
  if (normalized === VideoType.YOUTUBE) return VideoType.YOUTUBE;

  // Direct uploaded files like .mp4/.mov should not be persisted as HLS.
  return undefined;
}

/**
 * Normalizes videoType from various formats to standard format
 */
export function normalizeVideoType(
  videoType?: string | null,
  videoUrl?: string | null
): VideoType {
  const inferred = inferVideoTypeFromUrl(videoUrl);
  if (inferred) return inferred;

  if (!videoType) {
    // The non-YouTube branch in the UI currently handles uploaded/direct URLs.
    return videoUrl ? VideoType.HLS : VideoType.YOUTUBE;
  }

  if (videoType.toUpperCase() === VideoType.HLS) return VideoType.HLS;
  if (videoType.toUpperCase() === VideoType.YOUTUBE) return VideoType.YOUTUBE;

  return videoUrl ? VideoType.HLS : VideoType.YOUTUBE;
}

/**
 * Maps content data to form data
 */
export function contentToFormData(content: Content | null): ContentFormData {
  if (!content) {
    return {
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
  }

  return {
    name: content.name || "",
    description: content.description || "",
    aiSummary: content.aiSummary || "",
    type: content.type || ContentType.LECTURE,
    pdfUrl: content.pdfUrl || "",
    markdownBody: content.markdownBody || "",
    externalUrl: content.externalUrl || "",
    externalProvider: content.externalProvider || "",
    videoUrl: content.videoUrl || "",
    videoType: normalizeVideoType(content.videoType, content.videoUrl),
    videoThumbnail: content.videoThumbnail || "",
    videoDuration: content.videoDuration || 0,
  };
}

/**
 * Transforms form data and files to API payload
 */
export function formDataToContentData(
  formData: ContentFormData,
  files: ContentFormFiles,
  topicId?: string
): ContentData {
  const isPDF = formData.type === ContentType.PDF;
  const isLecture = formData.type === ContentType.LECTURE;
  const isMarkdown = formData.type === ContentType.MARKDOWN;
  const isUrl = formData.type === ContentType.URL;
  const resolvedVideoUrl = !isLecture
    ? undefined
    : formData.videoType === VideoType.YOUTUBE
    ? formData.videoUrl
    : files.videoFile || formData.videoUrl || undefined;

  return {
    name: formData.name,
    title: formData.name,
    description: formData.description.trim() || undefined,
    aiSummary: formData.aiSummary?.trim() || undefined,
    ...(topicId && { topicId }),
    type: formData.type,
    pdfUrl: isPDF ? files.pdfFile || formData.pdfUrl || undefined : undefined,
    markdownBody: isMarkdown
      ? formData.markdownBody.trim() || undefined
      : undefined,
    externalUrl: isUrl
      ? normalizeExternalUrl(formData.externalUrl) || undefined
      : undefined,
    externalProvider: isUrl
      ? formData.externalProvider.trim() || undefined
      : undefined,
    videoUrl: resolvedVideoUrl,
    videoType: isLecture
      ? resolveVideoTypeForStorage(formData.videoType, resolvedVideoUrl)
      : undefined,
    videoThumbnail: isLecture
      ? files.thumbnailFile || formData.videoThumbnail || undefined
      : undefined,
    ...(isLecture ? { videoDuration: formData.videoDuration } : {}),
  };
}

/**
 * Validates form data
 */
export function validateContentForm(formData: ContentFormData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!formData.name.trim()) {
    errors.push("Content name is required");
  }

  if (formData.type === ContentType.LECTURE) {
    if (!formData.videoDuration || formData.videoDuration <= 0) {
      errors.push("Video duration must be greater than 0");
    }
    if (formData.videoType === VideoType.YOUTUBE && !formData.videoUrl.trim()) {
      errors.push("YouTube URL is required");
    }
  }

  if (
    formData.type === ContentType.MARKDOWN &&
    !formData.markdownBody.trim()
  ) {
    errors.push("Markdown body is required");
  }

  if (formData.type === ContentType.URL && !formData.externalUrl.trim()) {
    errors.push("External URL is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
