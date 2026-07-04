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
import { useUpdateTopic } from "@/hooks";

interface Topic {
  id: string;
  name: string;
  chapterId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EditTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic | null;
  onSuccess?: () => void;
}

export function EditTopicModal({
  isOpen,
  onClose,
  topic,
  onSuccess,
}: EditTopicModalProps) {
  const [formData, setFormData] = useState({
    name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateTopicMutation = useUpdateTopic();

  // Initialize form data when topic changes
  useEffect(() => {
    if (topic) {
      setFormData({
        name: topic.name || "",
      });
    }
  }, [topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !topic) {
      return;
    }

    setIsSubmitting(true);

    try {
      const topicData = {
        name: formData.name,
      };

      await updateTopicMutation.mutateAsync({
        id: topic.id,
        data: topicData,
      });
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update topic:", error);
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

  if (!topic) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
          <DialogDescription>Update topic information.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Topic Name *</Label>
            <Input
              id="name"
              placeholder="Enter topic name"
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
              {isSubmitting ? "Updating..." : "Update Topic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
