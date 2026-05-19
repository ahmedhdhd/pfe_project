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
import { useUpdateChapter } from "@/hooks";

interface Chapter {
  id: string;
  name: string;
  subjectId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EditChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  onSuccess?: () => void;
}

export function EditChapterModal({
  isOpen,
  onClose,
  chapter,
  onSuccess,
}: EditChapterModalProps) {
  const [formData, setFormData] = useState({
    name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateChapterMutation = useUpdateChapter();

  // Initialize form data when chapter changes
  useEffect(() => {
    if (chapter) {
      setFormData({
        name: chapter.name || "",
      });
    }
  }, [chapter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !chapter) {
      return;
    }

    setIsSubmitting(true);

    try {
      const chapterData = {
        name: formData.name,
      };

      await updateChapterMutation.mutateAsync({
        id: chapter.id,
        data: chapterData,
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update chapter:", error);
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

  if (!chapter) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Chapter</DialogTitle>
          <DialogDescription>Update chapter information.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chapter Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Chapter Name *</Label>
            <Input
              id="name"
              placeholder="Enter chapter name"
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
              {isSubmitting ? "Updating..." : "Update Chapter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
