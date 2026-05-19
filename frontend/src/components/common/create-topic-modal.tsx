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
import { useCreateTopic } from "@/hooks";

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  onSuccess?: () => void;
}

export function CreateTopicModal({
  isOpen,
  onClose,
  chapterId,
  onSuccess,
}: CreateTopicModalProps) {
  const [formData, setFormData] = useState({
    name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTopicMutation = useCreateTopic();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const topicData = {
        name: formData.name,
        chapterId: chapterId,
      };

      await createTopicMutation.mutateAsync(topicData);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create topic:", error);
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New Topic</DialogTitle>
          <DialogDescription>
            Add a new topic under this chapter.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Topic Name *</Label>
            <Input
              id="name"
              placeholder="Enter topic name (e.g., Introduction to Variables)"
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
              {isSubmitting ? "Creating..." : "Create Topic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
