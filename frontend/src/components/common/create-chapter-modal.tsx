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
import { useCreateChapter } from "@/hooks";

interface CreateChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId?: string;
  batchId?: string;
  onSuccess?: () => void;
}

export function CreateChapterModal({
  isOpen,
  onClose,
  subjectId,
  batchId,
  onSuccess,
}: CreateChapterModalProps) {
  const [formData, setFormData] = useState({
    name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createChapterMutation = useCreateChapter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const chapterData: {
        name: string;
        subjectId?: string;
        batchId?: string;
      } = {
        name: formData.name,
      };

      if (typeof subjectId === "string" && subjectId.trim()) {
        chapterData.subjectId = subjectId;
      }

      if (typeof batchId === "string" && batchId.trim()) {
        chapterData.batchId = batchId;
      }

      await createChapterMutation.mutateAsync(chapterData);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create chapter:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chapter</DialogTitle>
          <DialogDescription>
            Add a new chapter to organize topics for this course.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chapter Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Chapter Name *</Label>
            <Input
              id="name"
              placeholder="Enter chapter name (e.g., Chapter 1: Introduction)"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Chapter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
