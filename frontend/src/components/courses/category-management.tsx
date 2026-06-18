"use client";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Pencil,
  Plus,
  Shapes,
  Trash2,
} from "@/components/icons";
import { toast } from "sonner";
import {
  useCreateCategory,
  useDeleteCategory,
  useGetCategories,
  useUpdateCategory,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_ICON_OPTIONS,
  CategoryOption,
  getCategoryIcon,
  getChildCategories,
  getRootCategories,
} from "@/lib/categories";

interface CategoryEditorState {
  id: string;
  name: string;
  icon: string;
  parentId: string;
}

const EMPTY_FORM = {
  name: "",
  icon: "Tag",
  parentId: "root",
};

export function CategoryManagement() {
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [editingCategory, setEditingCategory] =
    useState<CategoryEditorState | null>(null);

  const { data, isLoading } = useGetCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const categories = useMemo(
    () => ((data?.data as CategoryOption[] | undefined) ?? []),
    [data?.data]
  );
  const rootCategories = useMemo(
    () => getRootCategories(categories),
    [categories]
  );

  const resetCreateForm = () => setFormState(EMPTY_FORM);

  const handleCreateCategory = async () => {
    const name = formState.name.trim();

    if (!name) {
      toast.error("Enter a category name first.");
      return;
    }

    try {
      await createCategory.mutateAsync({
        name,
        icon: formState.icon,
        parentId: formState.parentId === "root" ? null : formState.parentId,
      });
      resetCreateForm();
      toast.success("Category saved.");
    } catch (error) {
      console.error("Failed to create category:", error);
      toast.error("Unable to save this category.");
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) {
      return;
    }

    const name = editingCategory.name.trim();

    if (!name) {
      toast.error("Category name is required.");
      return;
    }

    try {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        data: {
          name,
          icon: editingCategory.icon,
          parentId:
            editingCategory.parentId === "root"
              ? null
              : editingCategory.parentId,
        },
      });
      setEditingCategory(null);
      toast.success("Category updated.");
    } catch (error) {
      console.error("Failed to update category:", error);
      toast.error("Unable to update this category.");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteCategory.mutateAsync(categoryId);
      toast.success("Category deleted.");
    } catch (error) {
      console.error("Failed to delete category:", error);
      toast.error("Unable to delete this category.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shapes className="h-4 w-4 text-primary" />
            Category Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1.4fr,1fr,1fr,auto]">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Name</Label>
              <Input
                id="new-category-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Add a category or subcategory"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateCategory();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Select
                value={formState.icon}
                onValueChange={(value) =>
                  setFormState((current) => ({ ...current, icon: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose icon" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ICON_OPTIONS.map((option) => {
                    const Icon = getCategoryIcon(option.value);
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select
                value={formState.parentId}
                onValueChange={(value) =>
                  setFormState((current) => ({ ...current, parentId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Top-level category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Top-level category</SelectItem>
                  {rootCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleCreateCategory}
                disabled={createCategory.isPending}
                className="w-full md:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Create top-level categories like “Technology” and add
            subcategories like “Frontend” under them. The selected icon is used
            across course and exam browsing.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              Loading categories...
            </CardContent>
          </Card>
        ) : rootCategories.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No categories yet. Add one above to start organizing courses and
              exams.
            </CardContent>
          </Card>
        ) : (
          rootCategories.map((category) => {
            const Icon = getCategoryIcon(category.icon);
            const subcategories = getChildCategories(categories, category.id);

            return (
              <Card key={category.id} className="border-border/70">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">
                            {category._count?.batches ?? 0} courses
                          </Badge>
                          <Badge variant="secondary">
                            {category._count?.testSeries ?? 0} exams
                          </Badge>
                          <Badge variant="secondary">
                            {subcategories.length} subcategories
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditingCategory({
                            id: category.id,
                            name: category.name,
                            icon: category.icon || "Tag",
                            parentId: category.parentId || "root",
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {subcategories.length > 0 ? (
                    subcategories.map((subcategory) => {
                      const SubcategoryIcon = getCategoryIcon(subcategory.icon);

                      return (
                        <div
                          key={subcategory.id}
                          className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <SubcategoryIcon className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium">
                                {subcategory.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(subcategory._count?.batches ?? 0) +
                                  (subcategory._count?.testSeries ?? 0)}{" "}
                                assignments
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setEditingCategory({
                                  id: subcategory.id,
                                  name: subcategory.name,
                                  icon: subcategory.icon || "Tag",
                                  parentId: subcategory.parentId || "root",
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCategory(subcategory.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No subcategories yet. Use the parent selector above to add
                      one under this category.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCategory(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category name, icon, and parent placement.
            </DialogDescription>
          </DialogHeader>

          {editingCategory ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingCategory.name}
                  onChange={(event) =>
                    setEditingCategory((current) =>
                      current
                        ? {
                            ...current,
                            name: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={editingCategory.icon}
                  onValueChange={(value) =>
                    setEditingCategory((current) =>
                      current
                        ? {
                            ...current,
                            icon: value,
                          }
                        : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ICON_OPTIONS.map((option) => {
                      const Icon = getCategoryIcon(option.value);
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Parent</Label>
                <Select
                  value={editingCategory.parentId}
                  onValueChange={(value) =>
                    setEditingCategory((current) =>
                      current
                        ? {
                            ...current,
                            parentId: value,
                          }
                        : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Top-level category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="root">Top-level category</SelectItem>
                    {rootCategories
                      .filter((category) => category.id !== editingCategory.id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
                  {(() => {
                    const Icon = getCategoryIcon(editingCategory.icon);
                    return <Icon className="h-4 w-4 text-primary" />;
                  })()}
                  <span className="truncate">
                    {editingCategory.name.trim() || "Category name"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCategory(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={updateCategory.isPending}
            >
              {updateCategory.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
