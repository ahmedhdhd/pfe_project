import { useState, useCallback } from "react";
import {
  ContentFormData,
  ContentFormFiles,
  DEFAULT_FORM_DATA,
  DEFAULT_FORM_FILES,
  ContentType,
  VideoType,
  Content,
} from "./types";
import { contentToFormData, validateContentForm } from "./utils";

interface UseContentFormOptions {
  initialContent?: Partial<Content> | null;
}

export function useContentForm(options: UseContentFormOptions = {}) {
  const [formData, setFormData] = useState<ContentFormData>(() => {
    if (!options.initialContent) {
      return DEFAULT_FORM_DATA;
    }
    // Convert Partial<Content> to Content for contentToFormData
    const content: Content = {
      id: options.initialContent.id || "",
      name: options.initialContent.name || "",
      description: options.initialContent.description,
      topicId: options.initialContent.topicId || "",
      type: options.initialContent.type || ContentType.LECTURE,
      pdfUrl: options.initialContent.pdfUrl,
      markdownBody: options.initialContent.markdownBody,
      externalUrl: options.initialContent.externalUrl,
      externalProvider: options.initialContent.externalProvider,
      videoUrl: options.initialContent.videoUrl,
      videoType: options.initialContent.videoType,
      videoThumbnail: options.initialContent.videoThumbnail,
      videoDuration: options.initialContent.videoDuration,
      isCompleted: options.initialContent.isCompleted,
      createdAt: options.initialContent.createdAt,
      updatedAt: options.initialContent.updatedAt,
    };
    return contentToFormData(content);
  });
  const [files, setFiles] = useState<ContentFormFiles>(DEFAULT_FORM_FILES);

  const updateFormData = useCallback(
    <K extends keyof ContentFormData>(field: K, value: ContentFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const updateFormDataPartial = useCallback(
    (updates: Partial<ContentFormData>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const updateFile = useCallback(
    <K extends keyof ContentFormFiles>(
      field: K,
      value: ContentFormFiles[K]
    ) => {
      setFiles((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setFiles(DEFAULT_FORM_FILES);
  }, []);

  const validation = validateContentForm(formData);

  return {
    formData,
    files,
    updateFormData,
    updateFormDataPartial,
    updateFile,
    resetForm,
    validation,
    setFormData,
  };
}
