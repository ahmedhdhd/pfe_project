"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileVideo,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
} from "@/components/icons";
import {
  useMultipartUpload,
  useUploadProgressDisplay,
} from "@/hooks/use-multipart-upload";
import {
  formatBytes,
  formatTimeRemaining,
  ChunkProgress,
} from "@/lib/utils/multipart-upload";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DetailedHLSUploadProps {
  onUploadComplete: (cdnUrl: string) => void;
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function DetailedHLSUpload({
  onUploadComplete,
  folder = "course-videos",
  accept = "video/*",
  maxSize = 5000, // 5GB default
  className,
}: DetailedHLSUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showChunkDetails, setShowChunkDetails] = useState(false);
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
    setShowChunkDetails(false);
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

  const getChunkStatusBadge = (chunk: ChunkProgress) => {
    switch (chunk.status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            ✓
          </Badge>
        );
      case "uploading":
        return (
          <Badge variant="default" className="bg-blue-500">
            ↑
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">✕</Badge>;
      case "pending":
        return <Badge variant="outline">-</Badge>;
    }
  };

  const completedChunks =
    progress?.chunks.filter((c) => c.status === "completed").length || 0;
  const uploadingChunks =
    progress?.chunks.filter((c) => c.status === "uploading").length || 0;
  const errorChunks =
    progress?.chunks.filter((c) => c.status === "error").length || 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* File Input Area */}
      {!selectedFile && !isUploading && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-700"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileVideo className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Drop video file here or click to browse
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports MP4, WebM, MOV and other video formats
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            Maximum file size: {maxSize}MB ({(maxSize / 1024).toFixed(1)}GB)
          </p>
          <p className="text-xs text-muted-foreground">
            Large files will be split into 50MB chunks and uploaded in parallel
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
        <Card className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <FileVideo className="h-10 w-10 text-blue-500 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-lg">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatBytes(selectedFile.size)}
                </p>
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>Type: {selectedFile.type}</span>
                  <span>•</span>
                  <span>
                    Chunks: {Math.ceil(selectedFile.size / (50 * 1024 * 1024))}
                  </span>
                </div>
              </div>
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
            <Button onClick={handleUpload} className="flex-1" size="lg">
              <Upload className="h-4 w-4 mr-2" />
              Start Upload
            </Button>
          </div>
        </Card>
      )}

      {/* Upload Progress */}
      {(isUploading || progressDisplay.isCompleted) && (
        <Card className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-medium text-lg">{selectedFile?.name}</p>
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
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>

          {/* Overall Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="font-bold">{progressDisplay.percentage}%</span>
            </div>
            <Progress value={progressDisplay.percentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {progressDisplay.uploadedSize} / {progressDisplay.totalSize}
              </span>
              <span>
                {completedChunks} of {progressDisplay.totalChunks} chunks
                completed
              </span>
            </div>
          </div>

          {/* Upload Stats */}
          {isUploading && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Upload Speed
                </p>
                <p className="text-sm font-medium">
                  {formatBytes(uploadSpeed)}/s
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Time Remaining
                </p>
                <p className="text-sm font-medium">
                  {formatTimeRemaining(timeRemaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Uploading</p>
                <p className="text-sm font-medium">{uploadingChunks} chunks</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-green-500">
                    {completedChunks} ✓
                  </span>
                  {errorChunks > 0 && (
                    <span className="text-sm font-medium text-red-500">
                      {errorChunks} ✕
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Chunk Details Collapsible */}
          {progress && progress.chunks.length > 0 && (
            <Collapsible
              open={showChunkDetails}
              onOpenChange={setShowChunkDetails}
            >
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full">
                  {showChunkDetails ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Hide Chunk Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show Chunk Details ({progress.chunks.length} chunks)
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <ScrollArea className="h-[300px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {progress.chunks.map((chunk) => (
                      <div
                        key={chunk.partNumber}
                        className={cn(
                          "p-3 rounded-lg border transition-colors",
                          chunk.status === "uploading" &&
                            "bg-blue-50 dark:bg-blue-950/20 border-blue-200",
                          chunk.status === "completed" &&
                            "bg-green-50 dark:bg-green-950/20 border-green-200",
                          chunk.status === "error" &&
                            "bg-red-50 dark:bg-red-950/20 border-red-200",
                          chunk.status === "pending" && "bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getChunkStatusBadge(chunk)}
                            <span className="text-sm font-medium">
                              Chunk {chunk.partNumber}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(chunk.totalBytes)}
                          </span>
                        </div>

                        {chunk.status !== "pending" && (
                          <>
                            <Progress
                              value={chunk.percentage}
                              className={cn(
                                "h-1.5 mb-1",
                                chunk.status === "error" &&
                                  "[&>div]:bg-red-500",
                                chunk.status === "completed" &&
                                  "[&>div]:bg-green-500",
                                chunk.status === "uploading" &&
                                  "[&>div]:bg-blue-500"
                              )}
                            />
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {formatBytes(chunk.uploadedBytes)} /{" "}
                                {formatBytes(chunk.totalBytes)}
                              </span>
                              <span
                                className={cn(
                                  "font-medium",
                                  chunk.status === "completed" &&
                                    "text-green-600",
                                  chunk.status === "uploading" &&
                                    "text-blue-600",
                                  chunk.status === "error" && "text-red-600"
                                )}
                              >
                                {chunk.percentage}%
                              </span>
                            </div>
                          </>
                        )}

                        {chunk.error && (
                          <p className="text-xs text-red-500 mt-1">
                            {chunk.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Success Message */}
          {progressDisplay.isCompleted && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                <strong>Success!</strong> Video uploaded successfully.
                Processing for HLS streaming...
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
        </Card>
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
