"use client";

import { useState, useEffect } from "react";
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
import Image from "next/image";
import { useUpdateSubject } from "@/hooks";

interface Subject {
  id: string;
  name: string;
  batchId: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EditSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSuccess?: () => void;
}

export function EditSubjectModal({
  isOpen,
  onClose,
  subject,
  onSuccess,
}: EditSubjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    thumbnailUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const updateSubjectMutation = useUpdateSubject();

  // Initialize form data when subject changes
  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name || "",
        thumbnailUrl: subject.thumbnailUrl || "",
      });
    }
  }, [subject]);

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

    if (!formData.name.trim() || !subject) {
      return;
    }

    setIsSubmitting(true);

    try {
      const subjectData = {
        name: formData.name,
        thumbnailUrl: formData.thumbnailUrl || undefined,
      };

      await updateSubjectMutation.mutateAsync({
        id: subject.id,
        data: subjectData,
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update subject:", error);
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

  if (!subject) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Subject</DialogTitle>
          <DialogDescription>Update subject information.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Subject Name *</Label>
            <Input
              id="name"
              placeholder="Enter subject name"
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
            {formData.thumbnailUrl && (
              <div className="mb-2 h-20 w-20 relative rounded-lg border overflow-hidden">
                <Image
                  src={formData.thumbnailUrl}
                  alt="Current thumbnail"
                  className="object-cover"
                  fill
                  sizes="80px"
                />
              </div>
            )}
            <FileUpload
              onUploadComplete={handleThumbnailUpload}
              accept="image/*"
              maxSize={10}
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
              {isSubmitting ? "Updating..." : "Update Subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
