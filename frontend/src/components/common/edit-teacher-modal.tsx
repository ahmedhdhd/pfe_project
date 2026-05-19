"use client";

import { useState, useEffect } from "react";
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
import {
  X,
  Plus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
} from "lucide-react";
import Image from "next/image";
import { useUpdateTeacher } from "@/hooks";

interface Teacher {
  id: string;
  name: string;
  imageUrl?: string;
  subjects: string[];
  highlights: string | { content: string };
  batchIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  batchId?: string; // Add batchId prop
  onSuccess?: () => void;
}

export function EditTeacherModal({
  isOpen,
  onClose,
  teacher,
  batchId,
  onSuccess,
}: EditTeacherModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    imageUrl: "",
    subjects: [] as string[],
    highlights: "" as string,
  });
  const [newSubject, setNewSubject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const updateTeacherMutation = useUpdateTeacher();

  // Initialize form data when teacher changes
  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || "",
        imageUrl: teacher.imageUrl || "",
        subjects: teacher.subjects || [],
        highlights:
          typeof teacher.highlights === "string"
            ? teacher.highlights
            : teacher.highlights?.content || "",
      });
    }
  }, [teacher]);

  // Rich text editor functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

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

    if (!formData.name.trim() || !teacher) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateTeacherMutation.mutateAsync({
        id: teacher.id,
        data: {
          name: formData.name,
          imageUrl: formData.imageUrl || undefined,
          subjects: formData.subjects,
          highlights: {
            content: formData.highlights,
          },
          batchId: batchId || teacher.batchIds?.[0] || "", // Use provided batchId or first batch ID
        },
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update teacher:", error);
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

  if (!teacher) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw]">
        <DialogHeader>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update teacher information and details.
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
            {formData.imageUrl && (
              <div className="mb-2 h-20 w-20 relative rounded-lg border overflow-hidden">
                <Image
                  src={formData.imageUrl}
                  alt="Current teacher image"
                  className="object-cover"
                  fill
                  sizes="80px"
                />
              </div>
            )}
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
            <div className="border rounded-lg">
              {/* Rich Text Toolbar */}
              <div className="flex items-center space-x-1 p-2 border-b bg-muted/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText("bold")}
                  className="h-8 w-8 p-0"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText("italic")}
                  className="h-8 w-8 p-0"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText("underline")}
                  className="h-8 w-8 p-0"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-6 bg-border mx-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText("insertUnorderedList")}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => formatText("insertOrderedList")}
                  className="h-8 w-8 p-0"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>

              {/* Rich Text Editor */}
              <div
                contentEditable
                className="min-h-[120px] p-3 focus:outline-none"
                style={{ whiteSpace: "pre-wrap" }}
                onInput={(e) => {
                  const target = e.target as HTMLElement;
                  setFormData((prev) => ({
                    ...prev,
                    highlights: target.innerText,
                  }));
                }}
                suppressContentEditableWarning={true}
              >
                {formData.highlights ||
                  "Enter teacher details, achievements, experience, and highlights..."}
              </div>
            </div>
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
              {isSubmitting ? "Updating..." : "Update Teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
