"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useCreateTestSeries, TestSeries } from "@/hooks/test-series";
import { useGetCategories } from "@/hooks";
import { FileUpload } from "@/components/common/file-upload";
import Image from "next/image";
import { X, Plus } from "@/components/icons";
import {
  CategoryOption,
  getCategoryIcon,
  getChildCategories,
  getRootCategories,
  resolveAssignedCategoryId,
} from "@/lib/categories";

interface FAQ {
  id: string;
  title: string;
  description: string;
}

interface CreateTestSeriesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (testSeries: TestSeries) => void;
}

export function CreateTestSeriesModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateTestSeriesModalProps) {
  const [formData, setFormData] = useState({
    categoryId: "",
    subcategoryId: "",
    title: "",
    description: "",
    slug: "",
    imageUrl: "",
    durationDays: 365,
    isActive: true,
  });

  const createMutation = useCreateTestSeries();
  const { data: categoriesResponse } = useGetCategories();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newFaq, setNewFaq] = useState({ title: "", description: "" });
  const [isAddingFaq, setIsAddingFaq] = useState(false);

  const categories = useMemo(
    () => ((categoriesResponse?.data as CategoryOption[] | undefined) ?? []),
    [categoriesResponse?.data]
  );
  const rootCategories = useMemo(
    () => getRootCategories(categories),
    [categories]
  );
  const subcategories = useMemo(
    () => getChildCategories(categories, formData.categoryId || null),
    [categories, formData.categoryId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createMutation.mutateAsync({
        categoryId: resolveAssignedCategoryId(
          formData.categoryId,
          formData.subcategoryId
        ),
        title: formData.title,
        description: {
          html: formData.description,
          features: [],
        },
        slug: formData.slug,
        imageUrl: formData.imageUrl || undefined,
        faq: faqs.map((faq) => ({
          title: faq.title,
          description: faq.description,
        })),
        totalPrice: 0,
        discountPercentage: 0,
        isFree: true,
        durationDays: formData.durationDays,
        isActive: formData.isActive,
      });

      setFormData({
        categoryId: "",
        subcategoryId: "",
        title: "",
        description: "",
        slug: "",
        imageUrl: "",
        durationDays: 365,
        isActive: true,
      });
      setFaqs([]);
      setNewFaq({ title: "", description: "" });
      setIsAddingFaq(false);
      onOpenChange(false);
      onSuccess?.(result.data);
    } catch (error) {
      console.error("Failed to create test series:", error);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData({ ...formData, title, slug });
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
    setFormData({ ...formData, imageUrl: fileData.url });
    setIsUploadingImage(false);
  };

  const handleAddFaq = () => {
    if (newFaq.title.trim() && newFaq.description.trim()) {
      const faq: FAQ = {
        id: Date.now().toString(),
        title: newFaq.title,
        description: newFaq.description,
      };
      setFaqs((prev) => [...prev, faq]);
      setNewFaq({ title: "", description: "" });
      setIsAddingFaq(false);
    }
  };

  const handleRemoveFaq = (id: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Assessment Bundle</DialogTitle>
          <DialogDescription>
            Add a new assessment bundle and organize it under the same
            categories used by your courses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="categoryId">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.categoryId || undefined}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    categoryId: value,
                    subcategoryId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {rootCategories.map((category) => {
                    const Icon = getCategoryIcon(category.icon);
                    return (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {category.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategoryId">Subcategory</Label>
              <Select
                value={formData.subcategoryId || undefined}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    subcategoryId: value,
                  }))
                }
                disabled={!formData.categoryId || subcategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((category) => {
                    const Icon = getCategoryIcon(category.icon);
                    return (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {category.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Frontend Mock Test Bundle"
              value={formData.title}
              onChange={handleTitleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-red-500">*</span>
            </Label>
            <Input
              id="slug"
              placeholder="frontend-mock-test-bundle"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Auto-generated from the title and used in URLs.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what students will practice in this assessment bundle..."
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Bundle Image (Optional)</Label>
            <div className="space-y-4">
              {formData.imageUrl && (
                <div className="relative h-48 w-full overflow-hidden rounded-lg border">
                  <Image
                    src={formData.imageUrl}
                    alt="Assessment bundle preview"
                    className="object-cover"
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => setFormData({ ...formData, imageUrl: "" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <FileUpload
                onUploadComplete={handleImageUpload}
                accept="image/*"
                maxSize={10}
                folder="test-series-images"
                className="w-full"
              />

              {isUploadingImage && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary" />
                  <span>Uploading image...</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 text-sm text-muted-foreground">
            Test series pricing is disabled. Assessments are published as free
            items and organized only by category.
          </div>

          <div className="space-y-2">
            <Label htmlFor="durationDays">Duration (Days)</Label>
            <Input
              id="durationDays"
              type="number"
              min="1"
              placeholder="365"
              value={formData.durationDays}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  durationDays: parseInt(e.target.value, 10) || 365,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Access validity period for enrolled students
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
            <Label htmlFor="isActive">Active (visible to students)</Label>
          </div>

          <div className="space-y-2">
            <Label>Frequently Asked Questions (Optional)</Label>

            {faqs.length > 0 && (
              <div className="mb-4 space-y-3">
                {faqs.map((faq) => (
                  <div key={faq.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{faq.title}</h4>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {faq.description}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFaq(faq.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAddingFaq ? (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-2">
                  <Label htmlFor="faq-title">Question</Label>
                  <Input
                    id="faq-title"
                    placeholder="What is this assessment bundle about?"
                    value={newFaq.title}
                    onChange={(e) =>
                      setNewFaq((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faq-description">Answer</Label>
                  <Textarea
                    id="faq-description"
                    placeholder="This assessment bundle covers..."
                    value={newFaq.description}
                    onChange={(e) =>
                      setNewFaq((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddFaq}
                    disabled={
                      !newFaq.title.trim() || !newFaq.description.trim()
                    }
                  >
                    Add FAQ
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingFaq(false);
                      setNewFaq({ title: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingFaq(true)}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add FAQ
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !formData.categoryId}
            >
              {createMutation.isPending ? "Creating..." : "Create Bundle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
