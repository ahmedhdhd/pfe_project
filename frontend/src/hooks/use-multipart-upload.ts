"use client";

import { useState, useRef, useCallback } from "react";
import {
  MultipartUploader,
  UploadProgress,
  formatBytes,
  formatTimeRemaining,
} from "@/lib/utils/multipart-upload";

export interface UseMultipartUploadOptions {
  folder?: string;
  onSuccess?: (cdnUrl: string) => void;
  onError?: (error: Error) => void;
}

export interface UseMultipartUploadReturn {
  upload: (file: File) => Promise<string>;
  abort: () => Promise<void>;
  progress: UploadProgress | null;
  isUploading: boolean;
  error: Error | null;
  reset: () => void;
  uploadSpeed: number; // bytes per second
  timeRemaining: number; // seconds
}

/**
 * React hook for multipart video uploads
 */
export function useMultipartUpload(
  options: UseMultipartUploadOptions = {}
): UseMultipartUploadReturn {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const uploaderRef = useRef<MultipartUploader | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastProgressRef = useRef<{ bytes: number; time: number } | null>(null);

  /**
   * Start uploading a file
   */
  const upload = useCallback(
    async (file: File): Promise<string> => {
      setIsUploading(true);
      setError(null);
      setProgress(null);
      setUploadSpeed(0);
      setTimeRemaining(0);
      startTimeRef.current = Date.now();
      lastProgressRef.current = null;

      const uploader = new MultipartUploader(file, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        folder: options.folder,
        onProgress: (prog) => {
          setProgress(prog);

          // Calculate upload speed and time remaining
          const now = Date.now();
          const elapsed = (now - startTimeRef.current) / 1000; // seconds

          if (elapsed > 0 && prog.uploadedBytes > 0) {
            // Average speed since start
            const avgSpeed = prog.uploadedBytes / elapsed;
            setUploadSpeed(avgSpeed);

            // Estimate time remaining
            const remainingBytes = prog.totalBytes - prog.uploadedBytes;
            const remaining = remainingBytes / avgSpeed;
            setTimeRemaining(remaining);
          }
        },
        onComplete: (cdnUrl) => {
          setIsUploading(false);
          options.onSuccess?.(cdnUrl);
        },
        onError: (err) => {
          setError(err);
          setIsUploading(false);
          options.onError?.(err);
        },
      });

      uploaderRef.current = uploader;

      try {
        const cdnUrl = await uploader.upload();
        return cdnUrl;
      } catch (err) {
        throw err;
      } finally {
        uploaderRef.current = null;
      }
    },
    [options]
  );

  /**
   * Abort the current upload
   */
  const abort = useCallback(async () => {
    if (uploaderRef.current) {
      await uploaderRef.current.abort();
      uploaderRef.current = null;
      setIsUploading(false);
      setProgress((prev) => (prev ? { ...prev, status: "aborted" } : null));
    }
  }, []);

  /**
   * Reset the upload state
   */
  const reset = useCallback(() => {
    setProgress(null);
    setIsUploading(false);
    setError(null);
    setUploadSpeed(0);
    setTimeRemaining(0);
    uploaderRef.current = null;
  }, []);

  return {
    upload,
    abort,
    progress,
    isUploading,
    error,
    reset,
    uploadSpeed,
    timeRemaining,
  };
}

/**
 * Hook for displaying upload progress with formatted values
 */
export function useUploadProgressDisplay(progress: UploadProgress | null) {
  if (!progress) {
    return {
      percentage: 0,
      uploadedSize: "0 Bytes",
      totalSize: "0 Bytes",
      uploadedChunks: 0,
      totalChunks: 0,
      currentChunk: 0,
      status: "idle" as const,
      isUploading: false,
      isCompleted: false,
      hasError: false,
    };
  }

  return {
    percentage: progress.percentage,
    uploadedSize: formatBytes(progress.uploadedBytes),
    totalSize: formatBytes(progress.totalBytes),
    uploadedChunks: progress.uploadedChunks,
    totalChunks: progress.totalChunks,
    currentChunk: progress.currentChunk || 0,
    status: progress.status,
    isUploading:
      progress.status === "uploading" || progress.status === "initiating",
    isCompleted: progress.status === "completed",
    hasError: progress.status === "error",
    error: progress.error,
  };
}
