"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import {
  useMultipartUpload,
  useUploadProgressDisplay,
} from "@/hooks/use-multipart-upload";
import { formatBytes, formatTimeRemaining } from "@/lib/utils/multipart-upload";
import { cn } from "@/lib/utils";

interface HLSVideoUploadProps {
  onUploadComplete: (cdnUrl: string) => void;
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function HLSVideoUpload({
  onUploadComplete,
  folder = "course-videos",
  accept = "video/*",
  maxSize = 500, // 500MB default
  className,
}: HLSVideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    upload,
    abort,
    progress,
    isUploading,
    error,
    reset,
    uploadSpeed,
    timeRemaining,
  } = useMultipartUpload({
    folder,
    onSuccess: (cdnUrl) => {
      onUploadComplete(cdnUrl);
    },
    onError: (err) => {
      console.error("Upload failed:", err);
    },
  });

  const progressDisplay = useUploadProgressDisplay(progress);

  const handleFileSelect = (file: File) => {
    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("video/")) {
      alert("Please select a valid video file");
      return;
    }

    setSelectedFile(file);
    reset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await upload(selectedFile);
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAbort = async () => {
    await abort();
  };

  const getStatusIcon = () => {
    switch (progressDisplay.status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
      case "initiating":
      case "completing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (progressDisplay.status) {
      case "initiating":
        return "Preparing upload...";
      case "uploading":
        return "Uploading chunks...";
      case "completing":
        return "Finalizing upload...";
      case "completed":
        return "Upload completed!";
      case "error":
        return "Upload failed";
      case "aborted":
        return "Upload cancelled";
      default:
        return "Ready to upload";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* File Input Area */}
      {!selectedFile && !isUploading && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drop video file here or click to browse
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports MP4, WebM, MOV and other video formats
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum file size: {maxSize}MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Selected File Info */}
      {selectedFile && !isUploading && !progressDisplay.isCompleted && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpload} className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Start Upload
            </Button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {(isUploading || progressDisplay.isCompleted) && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <div>
                <p className="font-medium">{selectedFile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getStatusText()}
                </p>
              </div>
            </div>
            {isUploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAbort}
                className="text-red-500 hover:text-red-600"
              >
                Cancel
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progressDisplay.percentage} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progressDisplay.uploadedSize} / {progressDisplay.totalSize}
              </span>
              <span>{progressDisplay.percentage}%</span>
            </div>
          </div>

          {/* Chunk Progress */}
          {isUploading && (
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Chunk {progressDisplay.currentChunk} of{" "}
                  {progressDisplay.totalChunks}
                </span>
                <span>
                  {progressDisplay.uploadedChunks} /{" "}
                  {progressDisplay.totalChunks} completed
                </span>
              </div>
              {uploadSpeed > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Speed: {formatBytes(uploadSpeed)}/s</span>
                  <span>
                    Time remaining: {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Success Message */}
          {progressDisplay.isCompleted && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                Video uploaded successfully! Processing for HLS streaming...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {progressDisplay.hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {progressDisplay.error || "Upload failed. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {/* Reset Button */}
          {(progressDisplay.isCompleted || progressDisplay.hasError) && (
            <Button variant="outline" onClick={handleCancel} className="w-full">
              Upload Another Video
            </Button>
          )}
        </div>
      )}

      {/* General Error */}
      {error && !progressDisplay.hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
