"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateContent } from "@/hooks";
import { Video, FileText, BookOpen, Braces, Link2 } from "@/components/icons";
import { FileUpload } from "@/components/common/file-upload";
import { DetailedHLSUpload } from "@/components/common/detailed-hls-upload";
import { ContentType, VideoType } from "@/components/common/content-form";
import { resolveVideoTypeForStorage } from "@/components/common/content-form/utils";
import { normalizeExternalUrl } from "@/lib/utils/external-resource";

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  onSuccess?: () => void;
}

export function CreateContentModal({
  isOpen,
  onClose,
  topicId,
  onSuccess,
}: CreateContentModalProps) {
  const [isTypeStepOpen, setIsTypeStepOpen] = useState(false);
  const [isFormStepOpen, setIsFormStepOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: ContentType.LECTURE,
    pdfUrl: "",
    markdownBody: "",
    externalUrl: "",
    videoUrl: "",
    videoType: VideoType.YOUTUBE,
    videoThumbnail: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState<string>("");
  const [videoFile, setVideoFile] = useState<string>("");
  const [thumbnailFile, setThumbnailFile] = useState<string>("");

  const createContentMutation = useCreateContent();

  const contentTypeOptions = [
    {
      value: ContentType.LECTURE,
      label: "Lecture",
      description: "Video lesson (YouTube or uploaded video)",
      icon: BookOpen,
    },
    {
      value: ContentType.PDF,
      label: "PDF",
      description: "Upload or link a PDF document",
      icon: FileText,
    },
    {
      value: ContentType.MARKDOWN,
      label: "Markdown",
      description: "Write lesson content in markdown",
      icon: Braces,
    },
    {
      value: ContentType.URL,
      label: "External URL",
      description: "Attach a resource link",
      icon: Link2,
    },
  ] as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    // Validate type-specific required fields
    if (
      formData.type === ContentType.MARKDOWN &&
      !formData.markdownBody.trim()
    ) {
      return;
    }
    if (formData.type === ContentType.URL && !formData.externalUrl.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const isLecture = formData.type === ContentType.LECTURE;
      const resolvedVideoUrl =
        !isLecture
          ? undefined
          : formData.videoType === VideoType.YOUTUBE
          ? formData.videoUrl
          : videoFile || formData.videoUrl || undefined;

      const contentData = {
        title: formData.name,
        description: formData.description.trim() || undefined,
        topicId: topicId,
        type: formData.type,
        pdfUrl:
          formData.type === ContentType.PDF
            ? pdfFile || formData.pdfUrl || undefined
            : undefined,
        markdownBody:
          formData.type === ContentType.MARKDOWN
            ? formData.markdownBody.trim()
            : undefined,
        externalUrl:
          formData.type === ContentType.URL
            ? normalizeExternalUrl(formData.externalUrl)
            : undefined,
        videoUrl: resolvedVideoUrl,
        videoType:
          isLecture
            ? resolveVideoTypeForStorage(formData.videoType, resolvedVideoUrl)
            : undefined,
        videoThumbnail:
          isLecture ? thumbnailFile || formData.videoThumbnail || undefined : undefined,
      };

      await createContentMutation.mutateAsync(contentData);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create content:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      type: ContentType.LECTURE,
      pdfUrl: "",
      markdownBody: "",
      externalUrl: "",
      videoUrl: "",
      videoType: VideoType.YOUTUBE,
      videoThumbnail: "",
    });
    setPdfFile("");
    setVideoFile("");
    setThumbnailFile("");
    setIsTypeStepOpen(false);
    setIsFormStepOpen(false);
    onClose();
  };

  const openTypeStep = () => {
    setIsTypeStepOpen(true);
    setIsFormStepOpen(false);
  };

  const selectTypeAndContinue = (type: ContentType) => {
    setFormData((prev) => ({ ...prev, type }));
    setIsTypeStepOpen(false);
    setIsFormStepOpen(true);
  };

  const backToTypeStep = () => {
    setIsFormStepOpen(false);
    setIsTypeStepOpen(true);
  };

  const closeTypeStep = (open: boolean) => {
    setIsTypeStepOpen(open);
    if (!open && !isFormStepOpen) {
      handleClose();
    }
  };

  const closeFormStep = (open: boolean) => {
    setIsFormStepOpen(open);
    if (!open) {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen && !isTypeStepOpen && !isFormStepOpen) {
      openTypeStep();
    }
  }, [isOpen, isTypeStepOpen, isFormStepOpen]);

  return (
    <>
      <Dialog open={isTypeStepOpen} onOpenChange={closeTypeStep}>
        <DialogContent className="sm:max-w-md max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Choose Content Type</DialogTitle>
            <DialogDescription>
              Select what kind of content you want to create first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {contentTypeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted"
                  onClick={() => selectTypeAndContinue(option.value)}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormStepOpen} onOpenChange={closeFormStep}>
      <DialogContent
        className={`max-w-[95vw] max-h-[90vh] overflow-y-auto ${
          formData.type === ContentType.MARKDOWN ? "sm:max-w-4xl" : "sm:max-w-lg"
        }`}
      >
        <DialogHeader>
          <DialogTitle>Create New Content</DialogTitle>
          <DialogDescription>
            Add content to this topic.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Content Name *</Label>
            <Input
              id="name"
              placeholder="Enter content name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add a short description for this content"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-sm font-medium">{formData.type}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={backToTypeStep}
              >
                Change
              </Button>
            </div>
          </div>

          {/* Conditional Fields based on Type */}
          {formData.type === ContentType.LECTURE && (
            <>
              <div className="space-y-2">
                <Label htmlFor="videoType">Video Type *</Label>
                <Select
                  value={formData.videoType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      videoType: value as typeof formData.videoType,
                      videoUrl: "", // Reset URL when changing type
                    }))
                  }
                >
                  <SelectTrigger id="videoType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VideoType.YOUTUBE}>
                      <div className="flex items-center space-x-2">
                        <Video className="h-4 w-4" />
                        <span>YouTube</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={VideoType.HLS}>
                      Upload / URL
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* YouTube URL Input */}
              {formData.videoType === VideoType.YOUTUBE && (
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">YouTube URL *</Label>
                  <Input
                    id="videoUrl"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formData.videoUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        videoUrl: e.target.value,
                      }))
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full YouTube video URL or video ID
                  </p>
                </div>
              )}

              {/* Video Upload for HLS */}
              {formData.videoType === VideoType.HLS && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoUpload">Upload Video *</Label>
                    <p className="text-xs text-muted-foreground">
                      Upload a direct video file or use an HLS manifest URL.
                      Large videos will be split into 50MB chunks and uploaded
                      in parallel with detailed progress.
                    </p>
                    <DetailedHLSUpload
                      onUploadComplete={(cdnUrl: string) => {
                        setVideoFile(cdnUrl);
                        setFormData((prev) => ({
                          ...prev,
                          videoUrl: cdnUrl,
                        }));
                      }}
                      folder="course-videos"
                      maxSize={5000} // 5GB max
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Enter Video URL (Optional)</Label>
                    <Input
                      id="videoUrl"
                      placeholder="https://cdn.example.com/video.mp4 or .m3u8"
                      value={formData.videoUrl}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          videoUrl: e.target.value,
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a direct video URL like `.mp4` or an HLS manifest
                      URL like `.m3u8`
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="videoThumbnail">Video Thumbnail</Label>
                <FileUpload
                  accept="image/*"
                  maxSize={10}
                  onUploadComplete={(fileData) => {
                    setThumbnailFile(fileData.url);
                  }}
                />
                <div className="space-y-2">
                  <Label htmlFor="videoThumbnailUrl">
                    Or Enter Thumbnail URL
                  </Label>
                  <Input
                    id="videoThumbnailUrl"
                    placeholder="Enter thumbnail URL (optional)"
                    value={formData.videoThumbnail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        videoThumbnail: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </>
          )}

          {formData.type === ContentType.PDF && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pdfFile">Upload PDF</Label>
                <FileUpload
                  accept=".pdf"
                  onUploadComplete={(fileData) => {
                    setPdfFile(fileData.url);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pdfUrl">Or Enter PDF URL</Label>
                <Input
                  id="pdfUrl"
                  placeholder="Or enter PDF URL"
                  value={formData.pdfUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, pdfUrl: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          {formData.type === ContentType.MARKDOWN && (
            <div className="space-y-2">
              <Label htmlFor="markdownBody">Markdown Content *</Label>
              <Textarea
                id="markdownBody"
                placeholder="Write the lesson using Markdown..."
                value={formData.markdownBody}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    markdownBody: e.target.value,
                  }))
                }
                rows={12}
                className="font-mono text-sm"
                required
              />
            </div>
          )}

          {formData.type === ContentType.URL && (
            <div className="space-y-2">
              <Label htmlFor="externalUrl">External URL *</Label>
              <Input
                id="externalUrl"
                type="url"
                placeholder="https://docs.google.com/document/..."
                value={formData.externalUrl}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    externalUrl: e.target.value,
                  }))
                }
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={backToTypeStep}>
              Back
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.name.trim() ||
                (formData.type === ContentType.MARKDOWN &&
                  !formData.markdownBody.trim()) ||
                (formData.type === ContentType.URL &&
                  !formData.externalUrl.trim())
              }
            >
              {isSubmitting ? "Creating..." : "Create Content"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
