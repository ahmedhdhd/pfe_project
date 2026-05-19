"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/common/file-upload";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { X, Plus } from "lucide-react";
import { useCreateTeacher } from "@/hooks";

interface CreateTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId?: string;
  onSuccess?: () => void;
}

export function CreateTeacherModal({
  isOpen,
  onClose,
  batchId,
  onSuccess,
}: CreateTeacherModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    subjects: [] as string[],
    highlights: "" as string,
  });
  const [newSubject, setNewSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const createTeacherMutation = useCreateTeacher();

  const handleImageUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    setIsUploadingImage(true);
    try {
      setFormData((prev) => ({ ...prev, imageUrl: fileData.url }));
    } catch (error) {
      console.error("Failed to update image URL:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !formData.subjects.includes(newSubject.trim())) {
      setFormData((prev) => ({
        ...prev,
        subjects: [...prev.subjects, newSubject.trim()],
      }));
      setNewSubject("");
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s !== subject),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createTeacherMutation.mutateAsync({
        name: formData.name,
        imageUrl: formData.imageUrl || undefined,
        subjects: formData.subjects,
        highlights: {
          content: formData.highlights,
        },
        batchIds: batchId ? [batchId] : [],
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create teacher:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      imageUrl: "",
      subjects: [],
      highlights: "",
    });
    setNewSubject("");
    setIsUploadingImage(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Create New Teacher</DialogTitle>
          <DialogDescription>
            Add a new teacher to your organization. You can assign them to
            batches later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Teacher Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Teacher Name *</Label>
            <Input
              id="name"
              placeholder="Enter teacher's full name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* Teacher Image */}
          <div className="space-y-2">
            <Label>Teacher Image (Optional)</Label>
            <FileUpload
              onUploadComplete={handleImageUpload}
              accept="image/*"
              maxSize={10} // 10MB for images
              folder="teacher-images"
              className="w-full"
            />
            {isUploadingImage && (
              <p className="text-sm text-muted-foreground">
                Uploading image...
              </p>
            )}
          </div>

          {/* Subjects */}
          <div className="space-y-2">
            <Label>Subjects</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Add a subject (e.g., Mathematics, Physics)"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddSubject}
                disabled={!newSubject.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.subjects.map((subject) => (
                  <Badge
                    key={subject}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {subject}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleRemoveSubject(subject)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Teacher Highlights/Achievements */}
          <div className="space-y-2">
            <Label>Teacher Highlights & Achievements</Label>
            <RichTextEditor
              content={formData.highlights}
              onChange={(content: string) =>
                setFormData((prev) => ({
                  ...prev,
                  highlights: content,
                }))
              }
              placeholder="Enter teacher details, achievements, experience, and highlights..."
              className="min-h-[200px]"
            />
            <p className="text-xs text-muted-foreground">
              Describe the teacher&apos;s experience, achievements,
              qualifications, and what makes them special.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
