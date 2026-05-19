"use client";

import { useState } from "react";
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
import { useCreateTestSection, Section } from "@/hooks/test-series";

interface CreateSectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  onSuccess?: (section: Section) => void;
}

export function CreateSectionModal({
  open,
  onOpenChange,
  testId,
  onSuccess,
}: CreateSectionModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    displayOrder: 1,
  });

  const createMutation = useCreateTestSection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createMutation.mutateAsync({
        testId,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          displayOrder: formData.displayOrder,
        },
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        displayOrder: 1,
      });
      onOpenChange(false);
      onSuccess?.(result.data);
    } catch (error) {
      console.error("Failed to create section:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Section</DialogTitle>
          <DialogDescription>
            Add a new section to organize questions in this test
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Section Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Physics"
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
              placeholder="Section description (optional)"
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
            <p className="text-xs text-muted-foreground">
              Order in which this section appears in the test
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
