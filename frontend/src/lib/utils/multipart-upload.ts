/**
 * Multipart Upload Utility
 *
 * Handles large video file uploads using Supabase signed URLs
 * with progress tracking and error recovery.
 */

import apiClient from "@/lib/api/client";

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks (for progress display)
const MAX_CONCURRENT_UPLOADS = 1; // Direct upload to signed URL

export interface ChunkProgress {
  partNumber: number;
  status: "pending" | "uploading" | "completed" | "error";
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  error?: string;
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  uploadedChunks: number;
  totalChunks: number;
  currentChunk?: number;
  chunks: ChunkProgress[];
  status:
    | "idle"
    | "initiating"
    | "uploading"
    | "completing"
    | "completed"
    | "error"
    | "aborted";
  error?: string;
}

export interface MultipartUploadConfig {
  fileName: string;
  fileType: string;
  fileSize: number;
  folder?: string;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (cdnUrl: string) => void;
  onError?: (error: Error) => void;
}

interface InitiateResponse {
  success: boolean;
  data: {
    uploadId: string;
    key: string;
    bucket: string;
    signedUrl?: string;
  };
}

interface SignedUrlsResponse {
  success: boolean;
  data: {
    urls: Array<{
      partNumber: number;
      uploadUrl: string;
    }>;
    expiresIn: number;
  };
}

interface CompleteResponse {
  success: boolean;
  data: {
    key: string;
    publicUrl: string;
    cdnUrl: string;
    bucket: string;
  };
}

interface UploadPart {
  partNumber: number;
  ETag: string;
}

export class MultipartUploader {
  private file: File;
  private config: MultipartUploadConfig;
  private uploadId?: string;
  private key?: string;
  private aborted = false;
  private uploadedParts: UploadPart[] = [];
  private progress: UploadProgress;

  constructor(file: File, config: MultipartUploadConfig) {
    this.file = file;
    this.config = {
      ...config,
      folder: config.folder || "course-videos",
    };
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    this.progress = {
      uploadedBytes: 0,
      totalBytes: file.size,
      percentage: 0,
      uploadedChunks: 0,
      totalChunks,
      chunks: Array.from({ length: totalChunks }, (_, i) => ({
        partNumber: i + 1,
        status: "pending" as const,
        uploadedBytes: 0,
        totalBytes: Math.min(CHUNK_SIZE, file.size - i * CHUNK_SIZE),
        percentage: 0,
      })),
      status: "idle",
    };
  }

  /**
   * Start the multipart upload process
   * Uses Supabase signed URL for direct upload
   */
  async upload(): Promise<string> {
    try {
      this.updateProgress({ status: "initiating" });

      // Step 1: Initiate upload - get signed URL from Supabase
      const { uploadId, key, signedUrl } = await this.initiateUpload();
      this.uploadId = uploadId;
      this.key = key;

      if (!signedUrl) {
        throw new Error("No signed URL received from server");
      }

      if (this.aborted) {
        throw new Error("Upload aborted by user");
      }

      this.updateProgress({ status: "uploading" });

      // Step 2: Upload directly to signed URL (not chunked for Supabase)
      await this.uploadDirect(signedUrl);

      if (this.aborted) {
        throw new Error("Upload aborted by user");
      }

      this.updateProgress({ status: "completing" });

      // Step 3: Complete and get the public URL
      const cdnUrl = await this.completeUpload();

      this.updateProgress({ status: "completed", percentage: 100 });
      this.config.onComplete?.(cdnUrl);

      return cdnUrl;
    } catch (error) {
      this.updateProgress({
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
      this.config.onError?.(error as Error);

      throw error;
    }
  }

  /**
   * Upload entire file directly to Supabase signed URL
   */
  private async uploadDirect(signedUrl: string): Promise<void> {
    const xhr = new XMLHttpRequest();
    const method = "PUT";
    
    return new Promise((resolve, reject) => {
      xhr.open(method, signedUrl, true);
      xhr.setRequestHeader("Content-Type", this.config.fileType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const uploadedBytes = event.loaded;
          const totalBytes = event.total;
          const percentage = (uploadedBytes / totalBytes) * 100;

          this.updateProgress({
            uploadedBytes,
            totalBytes,
            percentage,
            uploadedChunks: 1,
            totalChunks: 1,
            currentChunk: 1,
          });
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Upload failed - network error"));
      };

      xhr.send(this.file);
    });
  }

  /**
   * Abort the upload and cleanup
   */
  async abort(): Promise<void> {
    this.aborted = true;
    this.updateProgress({ status: "aborted" });

    if (this.uploadId && this.key) {
      await this.abortUpload();
    }
  }

/**
   * Step 1: Initiate multipart upload - get signed URL from Supabase
   */
  private async initiateUpload(): Promise<{ uploadId: string; key: string; signedUrl: string }> {
    try {
      const response = await apiClient.post<InitiateResponse>(
        "/admin/upload/multipart/initiate",
        {
          fileName: this.config.fileName,
          fileType: this.config.fileType,
          fileSize: this.config.fileSize,
          folder: this.config.folder,
        }
      );

      const data = response.data;

      if (!data.success) {
        throw new Error("Failed to initiate upload");
      }

      return {
        uploadId: data.data.uploadId,
        key: data.data.key,
        signedUrl: data.data.signedUrl || '',
      };
    } catch (error: unknown) {
      let message = "Failed to initiate upload";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
      ) {
        const responseData = (
          error as { response?: { data?: { message?: string } } }
        ).response?.data;
        if (responseData && typeof responseData.message === "string") {
          message = `Failed to initiate upload: ${responseData.message}`;
        }
      } else if (error instanceof Error) {
        message = `Failed to initiate upload: ${error.message}`;
      }
      throw new Error(message);
    }
  }

  /**
   * Step 2: Get presigned URLs (not used for Supabase direct upload)
   */
  private async getSignedUrls(): Promise<
    Array<{ partNumber: number; uploadUrl: string }>
  > {
    return [];
  }

  /**
   * Step 3: Upload chunks (not used - we use direct upload instead)
   */
  private async uploadChunks(
    urls: Array<{ partNumber: number; uploadUrl: string }>
  ): Promise<void> {
    // Not used - direct upload is used instead
  }

  /**
   * Upload a single chunk (not used)
   */
  private async uploadChunk(
    chunk: Blob,
    uploadUrl: string,
    partNumber: number
  ): Promise<string> {
    return "";
  }

  /**
   * Update progress for a specific chunk
   */
  private updateChunkProgress(
    partNumber: number,
    updates: Partial<ChunkProgress>
  ): void {
    const chunkIndex = partNumber - 1;
    if (chunkIndex >= 0 && chunkIndex < this.progress.chunks.length) {
      this.progress.chunks[chunkIndex] = {
        ...this.progress.chunks[chunkIndex],
        ...updates,
      };
      // Notify progress listener
      this.config.onProgress?.(this.progress);
    }
  }

  /**
   * Step 4: Complete the multipart upload
   */
  private async completeUpload(): Promise<string> {
    try {
      const response = await apiClient.post<CompleteResponse>(
        "/admin/upload/multipart/complete",
        {
          uploadId: this.uploadId,
          key: this.key,
          parts: this.uploadedParts,
        }
      );

      const data = response.data;

      if (!data.success) {
        throw new Error("Failed to complete upload");
      }

      return data.data.cdnUrl;
    } catch (error: unknown) {
      let message = "Failed to complete upload";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
      ) {
        const responseData = (
          error as { response?: { data?: { message?: string } } }
        ).response?.data;
        if (responseData && typeof responseData.message === "string") {
          message = `Failed to complete upload: ${responseData.message}`;
        }
      } else if (error instanceof Error) {
        message = `Failed to complete upload: ${error.message}`;
      }
      throw new Error(message);
    }
  }

  /**
   * Abort the upload and cleanup
   */
  private async abortUpload(): Promise<void> {
    if (!this.uploadId || !this.key) return;

    try {
      await apiClient.post("/admin/upload/multipart/abort", {
        uploadId: this.uploadId,
        key: this.key,
      });
    } catch (error: unknown) {
      let message = "Unknown error";
      if (
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
      ) {
        const responseData = (
          error as { response?: { data?: { message?: string } } }
        ).response?.data;
        if (responseData && typeof responseData.message === "string") {
          message = responseData.message;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      console.error("Error aborting upload:", message);
    }
  }

  /**
   * Split file into chunks
   */
  private splitFileIntoChunks(): Blob[] {
    const chunks: Blob[] = [];
    let offset = 0;

    while (offset < this.file.size) {
      const end = Math.min(offset + CHUNK_SIZE, this.file.size);
      chunks.push(this.file.slice(offset, end));
      offset = end;
    }

    return chunks;
  }

  /**
   * Update progress and notify listener
   */
  private updateProgress(updates: Partial<UploadProgress>): void {
    this.progress = { ...this.progress, ...updates };
    this.config.onProgress?.(this.progress);
  }

  /**
   * Get current progress
   */
  getProgress(): UploadProgress {
    return { ...this.progress };
  }
}

/**
 * Helper function to format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Helper function to format time remaining
 */
export function formatTimeRemaining(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "Calculating...";

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
