"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  X,
  File,
  Image as ImageIcon,
  FileText,
  Video,
} from "@/components/icons";
import Image from "next/image";
import { useClientDirectUpload, useDirectUpload } from "@/hooks";

interface FileUploadProps {
  onUploadComplete: (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => void;
  accept?: string;
  maxSize?: number; // in MB
  folder?: string;
  endpoint?: "admin" | "student";
  className?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  result?: unknown;
}

export function FileUpload({
  onUploadComplete,
  accept = "image/*,video/*,.pdf",
  maxSize = 100, // 100MB default
  folder = "uploads", // eslint-disable-line @typescript-eslint/no-unused-vars
  endpoint = "admin",
  className = "",
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processedFilesRef = useRef<Set<string>>(new Set());

  const adminUploadMutation = useDirectUpload();
  const studentUploadMutation = useClientDirectUpload();
  const directUploadMutation =
    endpoint === "student" ? studentUploadMutation : adminUploadMutation;

  const matchesAccept = (file: File) => {
    const patterns = accept
      .split(",")
      .map((pattern) => pattern.trim().toLowerCase())
      .filter(Boolean);

    if (patterns.length === 0) return true;

    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    return patterns.some((pattern) => {
      if (pattern === "*/*") return true;
      if (pattern.startsWith(".")) return fileName.endsWith(pattern);
      if (pattern.endsWith("/*")) return fileType.startsWith(pattern.slice(0, -1));
      return fileType === pattern;
    });
  };

  const getAcceptError = () => {
    const normalized = accept.replace(/,/g, ", ");
    return normalized === ".pdf"
      ? "Only PDF files are allowed."
      : `Only ${normalized} files are allowed.`;
  };

  // Auto-upload pending files
  useEffect(() => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    pendingFiles.forEach((file) => {
      const fileKey = `${file.file?.name}-${file.file?.size}`;
      if (!processedFilesRef.current.has(fileKey)) {
        processedFilesRef.current.add(fileKey);
        const fileIndex = files.findIndex((f) => f === file);
        uploadFile(file, fileIndex);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const maxSizeBytes = maxSize * 1024 * 1024;

    const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => {
      if (!matchesAccept(file)) {
        return {
          file,
          progress: 0,
          status: "error",
          error: getAcceptError(),
        };
      }

      if (file.size > maxSizeBytes) {
        return {
          file,
          progress: 0,
          status: "error",
          error: `File exceeds ${maxSize}MB limit`,
        };
      }

      return {
        file,
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
        progress: 0,
        status: "pending",
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      const file = newFiles[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      // Remove from processed files tracking
      if (file?.file) {
        const fileKey = `${file.file.name}-${file.file.size}`;
        processedFilesRef.current.delete(fileKey);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const uploadFile = async (file: UploadedFile, index: number) => {
    try {
      // Update status to uploading
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: "uploading",
          progress: 0,
        };
        return newFiles;
      });

      // Create FormData for direct upload
      const formData = new FormData();
      formData.append("file", file.file);
      formData.append("folder", folder);

      const result = await directUploadMutation.mutateAsync(formData);

      // Update with success
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: "success",
          progress: 100,
          result: result.data,
        };
        return newFiles;
      });

      // Call the completion callback
      onUploadComplete(result.data);
    } catch (error) {
      // Update with error
      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[index] = {
          ...newFiles[index],
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        };
        return newFiles;
      });
    }
  };

  const getFileIcon = (file: File | undefined) => {
    if (!file || !file.type) return <File className="h-4 w-4" />;
    if (file.type.startsWith("image/"))
      return <ImageIcon className="h-4 w-4" />;
    if (file.type.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (file.type === "application/pdf")
      return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">
          Max {maxSize}MB • {accept}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-1">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {file.preview ? (
                    <div className="h-8 w-8 relative rounded overflow-hidden">
                      <Image
                        src={file.preview}
                        alt={`Preview of ${file.file?.name || "file"}`}
                        className="object-cover"
                        fill
                        sizes="32px"
                      />
                    </div>
                  ) : (
                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                      {getFileIcon(file.file)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.file?.name || "Unknown file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {file.file?.size
                        ? formatFileSize(file.file.size)
                        : "Unknown size"}
                    </p>
                  </div>
                  {file.status === "uploading" && (
                    <div className="w-16">
                      <Progress value={file.progress} className="h-1" />
                    </div>
                  )}
                  {file.status === "success" && (
                    <Badge variant="default" className="text-xs">
                      Success
                    </Badge>
                  )}
                  {file.status === "error" && (
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
