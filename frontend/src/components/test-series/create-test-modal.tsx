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
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useCreateTest, Test } from "@/hooks/test-series";

interface CreateTestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testSeriesId: string;
  onSuccess?: (test: Test) => void;
}

export function CreateTestModal({
  open,
  onOpenChange,
  testSeriesId,
  onSuccess,
}: CreateTestModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    durationMinutes: 60,
    totalMarks: 100,
    passingMarks: 33,
    isFree: false,
    showAnswersAfterSubmit: true,
    allowReview: true,
    shuffleQuestions: false,
  });

  const createMutation = useCreateTest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createMutation.mutateAsync({
        testSeriesId,
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        description: formData.description
          ? {
              html: formData.description,
              topics: [],
            }
          : undefined,
        instructions: {},
        durationMinutes: formData.durationMinutes,
        totalMarks: formData.totalMarks,
        passingMarks: formData.passingMarks,
        isFree: formData.isFree,
        showAnswersAfterSubmit: formData.showAnswersAfterSubmit,
        allowReview: formData.allowReview,
        shuffleQuestions: formData.shuffleQuestions,
      });

      // Reset form
      setFormData({
        title: "",
        slug: "",
        description: "",
        durationMinutes: 60,
        totalMarks: 100,
        passingMarks: 33,
        isFree: false,
        showAnswersAfterSubmit: true,
        allowReview: true,
        shuffleQuestions: false,
      });
      onOpenChange(false);
      onSuccess?.(result.data);
    } catch (error) {
      console.error("Failed to create test:", error);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = generateSlug(title);
    setFormData({ ...formData, title, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Test</DialogTitle>
          <DialogDescription>
            Add a new assessment to this bundle
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="JEE Main Mock Test 1"
              value={formData.title}
              onChange={handleTitleChange}
              required
            />
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-red-500">*</span>
            </Label>
            <Input
              id="slug"
              placeholder="jee-main-mock-test-1"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from title. Used in URLs.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              content={formData.description}
              onChange={(content) =>
                setFormData({ ...formData, description: content })
              }
              placeholder="Test description covering topics..."
            />
          </div>

          {/* Duration and Marks */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">
                Duration (min) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="durationMinutes"
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    durationMinutes: parseInt(e.target.value) || 60,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalMarks">
                Total Marks <span className="text-red-500">*</span>
              </Label>
              <Input
                id="totalMarks"
                type="number"
                min="1"
                value={formData.totalMarks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    totalMarks: parseInt(e.target.value) || 100,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passingMarks">
                Passing Marks <span className="text-red-500">*</span>
              </Label>
              <Input
                id="passingMarks"
                type="number"
                min="0"
                max={formData.totalMarks}
                value={formData.passingMarks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passingMarks: parseInt(e.target.value) || 33,
                  })
                }
                required
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="showAnswersAfterSubmit">
                Show Answers After Submit
              </Label>
              <Switch
                id="showAnswersAfterSubmit"
                checked={formData.showAnswersAfterSubmit}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, showAnswersAfterSubmit: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allowReview">Allow Review</Label>
              <Switch
                id="allowReview"
                checked={formData.allowReview}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, allowReview: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
              <Switch
                id="shuffleQuestions"
                checked={formData.shuffleQuestions}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, shuffleQuestions: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isFree">Free Test</Label>
              <Switch
                id="isFree"
                checked={formData.isFree}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isFree: checked })
                }
              />
            </div>
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
              {createMutation.isPending ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
