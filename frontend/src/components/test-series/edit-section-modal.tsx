"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateSection, Section } from "@/hooks/test-series";

interface EditSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: Section;
  onSuccess?: () => void;
}

export function EditSectionModal({
  open,
  onOpenChange,
  section,
  onSuccess,
}: EditSectionModalProps) {
  const [formData, setFormData] = useState({
    name: section.name,
    description: section.description || "",
    displayOrder: section.displayOrder,
  });

  const updateMutation = useUpdateSection();

  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name,
        description: section.description || "",
        displayOrder: section.displayOrder,
      });
    }
  }, [section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        id: section.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          displayOrder: formData.displayOrder,
        },
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update section:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Section</DialogTitle>
          <DialogDescription>Update section information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Section Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input
              id="displayOrder"
              type="number"
              min="1"
              value={formData.displayOrder}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  displayOrder: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
