"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/common/file-upload";
import { useCreateSubject } from "@/hooks";

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onSuccess?: () => void;
}

export function CreateSubjectModal({
  isOpen,
  onClose,
  batchId,
  onSuccess,
}: CreateSubjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    thumbnailUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const createSubjectMutation = useCreateSubject();

  const handleThumbnailUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    setIsUploadingThumbnail(true);
    try {
      setFormData((prev) => ({ ...prev, thumbnailUrl: fileData.url }));
    } catch (error) {
      console.error("Failed to update thumbnail URL:", error);
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const subjectData = {
        name: formData.name,
        batchId: batchId,
        thumbnailUrl: formData.thumbnailUrl || undefined,
      };

      await createSubjectMutation.mutateAsync(subjectData);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create subject:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      thumbnailUrl: "",
    });
    setIsUploadingThumbnail(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Subject</DialogTitle>
          <DialogDescription>
            Add a new subject to this course.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Subject Name *</Label>
            <Input
              id="name"
              placeholder="Enter subject name (e.g., Mathematics, Physics)"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Subject Thumbnail (Optional)</Label>
            <FileUpload
              onUploadComplete={handleThumbnailUpload}
              accept="image/*"
              maxSize={10} // 10MB for images
              folder="subject-thumbnails"
              className="w-full"
            />
            {isUploadingThumbnail && (
              <p className="text-sm text-muted-foreground">
                Uploading thumbnail...
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
