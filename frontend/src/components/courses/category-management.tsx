"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  FolderTree,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "@/components/icons";
import { toast } from "sonner";
import {
  useCreateCategory,
  useDeleteCategory,
  useGetCategories,
  useUpdateCategory,
} from "@/hooks";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { IconPicker } from "@/components/courses/icon-picker";
import { cn } from "@/lib/utils";
import {
  CategoryOption,
  getCategoryColor,
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

interface DeleteTarget {
  id: string;
  name: string;
}

const EMPTY_ROOT_FORM = {
  name: "",
  icon: "Tag",
  parentId: "root",
};

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
};

export function CategoryManagement() {
  const [search, setSearch] = useState("");
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [rootDialogOpen, setRootDialogOpen] = useState(false);
  const [rootForm, setRootForm] = useState(EMPTY_ROOT_FORM);
  const [addingSub, setAddingSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<CategoryEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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

  useEffect(() => {
    if (rootCategories.length === 0) {
      setSelectedRootId(null);
      return;
    }
    if (!selectedRootId || !rootCategories.some((c) => c.id === selectedRootId)) {
      setSelectedRootId(rootCategories[0].id);
    }
  }, [rootCategories, selectedRootId]);

  const filteredRoots = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rootCategories;
    return rootCategories.filter((category) =>
      category.name.toLowerCase().includes(query)
    );
  }, [rootCategories, search]);

  const selectedCategory = useMemo(
    () => rootCategories.find((category) => category.id === selectedRootId) ?? null,
    [rootCategories, selectedRootId]
  );

  const subcategories = useMemo(
    () => (selectedCategory ? getChildCategories(categories, selectedCategory.id) : []),
    [categories, selectedCategory]
  );

  const totals = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc.courses += category._count?.batches ?? 0;
        acc.exams += category._count?.testSeries ?? 0;
        return acc;
      },
      { courses: 0, exams: 0 }
    );
  }, [categories]);

  const resetRootForm = () => setRootForm(EMPTY_ROOT_FORM);

  const handleCreateRootCategory = async () => {
    const name = rootForm.name.trim();
    if (!name) {
      toast.error("Enter a category name first.");
      return;
    }

    try {
      const created = await createCategory.mutateAsync({
        name,
        icon: rootForm.icon,
        parentId: rootForm.parentId === "root" ? null : rootForm.parentId,
      });
      resetRootForm();
      setRootDialogOpen(false);
      const createdId = (created?.data as { id?: string } | undefined)?.id;
      if (createdId && rootForm.parentId === "root") {
        setSelectedRootId(createdId);
      }
      toast.success("Category saved.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Unable to save this category."));
    }
  };

  const handleAddSubcategory = async () => {
    if (!selectedCategory) return;
    const name = subName.trim();
    if (!name) {
      setAddingSub(false);
      return;
    }

    try {
      await createCategory.mutateAsync({
        name,
        icon: "Tag",
        parentId: selectedCategory.id,
      });
      setSubName("");
      setAddingSub(false);
      toast.success("Subcategory added.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Unable to add this subcategory."));
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
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
            editingCategory.parentId === "root" ? null : editingCategory.parentId,
        },
      });
      setEditingCategory(null);
      toast.success("Category updated.");
    } catch (error) {
      toast.error(extractErrorMessage(error, "Unable to update this category."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory.mutateAsync(deleteTarget.id);
      toast.success("Category deleted.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(extractErrorMessage(error, "Unable to delete this category."));
    }
  };

  const openEditor = (category: CategoryOption) =>
    setEditingCategory({
      id: category.id,
      name: category.name,
      icon: category.icon || "Tag",
      parentId: category.parentId || "root",
    });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
        <div className="bg-card px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Top-level categories
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {rootCategories.length}
          </p>
        </div>
        <div className="bg-card px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Courses tagged
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {totals.courses}
          </p>
        </div>
        <div className="col-span-2 bg-card px-4 py-3.5 sm:col-span-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Exams tagged
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {totals.exams}
          </p>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-[300px_1fr]">
        <div className="border-b border-border lg:border-b-0 lg:border-r">
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Categories</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  resetRootForm();
                  setRootDialogOpen(true);
                }}
                title="New category"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories"
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>

          <div className="max-h-[440px] space-y-0.5 overflow-y-auto px-2 pb-3">
            {isLoading ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">
                Loading...
              </p>
            ) : filteredRoots.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                {rootCategories.length === 0
                  ? "No categories yet."
                  : `No categories match "${search}".`}
              </p>
            ) : (
              filteredRoots.map((category) => {
                const Icon = getCategoryIcon(category.icon);
                const color = getCategoryColor(category.id);
                const isSelected = category.id === selectedRootId;
                const childCount = getChildCategories(categories, category.id).length;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedRootId(category.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} />
                    <Icon className={cn("h-4 w-4 shrink-0", color.text)} />
                    <span className="flex-1 truncate text-sm font-medium">
                      {category.name}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {childCount}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div>
          {!selectedCategory ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FolderTree className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">No categories yet</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Create a top-level category like &quot;Technology&quot; to start
                  organizing courses and exams.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  resetRootForm();
                  setRootDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New category
              </Button>
            </div>
          ) : (
            <>
              {(() => {
                const Icon = getCategoryIcon(selectedCategory.icon);
                const color = getCategoryColor(selectedCategory.id);
                return (
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl",
                          color.soft,
                          color.text
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold leading-tight">
                          {selectedCategory.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Top-level category
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditor(selectedCategory)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteTarget({
                            id: selectedCategory.id,
                            name: selectedCategory.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
                <div className="py-3">
                  <p className="text-lg font-semibold tabular-nums">
                    {selectedCategory._count?.batches ?? 0}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Courses
                  </p>
                </div>
                <div className="py-3">
                  <p className="text-lg font-semibold tabular-nums">
                    {selectedCategory._count?.testSeries ?? 0}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Exams
                  </p>
                </div>
                <div className="py-3">
                  <p className="text-lg font-semibold tabular-nums">
                    {subcategories.length}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Subcategories
                  </p>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Subcategories
                  </h4>
                  {!addingSub && (
                    <button
                      type="button"
                      onClick={() => setAddingSub(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  )}
                </div>

                <div className="space-y-0.5">
                  {subcategories.map((subcategory) => {
                    const SubIcon = getCategoryIcon(subcategory.icon);
                    const subColor = getCategoryColor(subcategory.id);
                    const assignments =
                      (subcategory._count?.batches ?? 0) +
                      (subcategory._count?.testSeries ?? 0);

                    return (
                      <div
                        key={subcategory.id}
                        className="group flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-accent/40"
                      >
                        <span
                          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", subColor.dot)}
                        />
                        <SubIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <p className="min-w-0 flex-1 truncate text-sm">
                          {subcategory.name}
                        </p>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {assignments}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditor(subcategory)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                id: subcategory.id,
                                name: subcategory.name,
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {addingSub && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-1.5">
                      <Input
                        autoFocus
                        value={subName}
                        onChange={(event) => setSubName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddSubcategory();
                          }
                          if (event.key === "Escape") {
                            setAddingSub(false);
                            setSubName("");
                          }
                        }}
                        placeholder="Subcategory name"
                        className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleAddSubcategory}
                        disabled={createCategory.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setAddingSub(false);
                          setSubName("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {!addingSub && subcategories.length === 0 && (
                    <p className="px-2.5 py-1 text-xs text-muted-foreground">
                      No subcategories yet.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={rootDialogOpen} onOpenChange={setRootDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New category</DialogTitle>
            <DialogDescription>
              Add a top-level category, or place it under an existing one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Name</Label>
              <Input
                id="new-category-name"
                value={rootForm.name}
                onChange={(event) =>
                  setRootForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Technology"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateRootCategory();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-category-icon">Icon</Label>
              <IconPicker
                id="new-category-icon"
                value={rootForm.icon}
                onChange={(value) =>
                  setRootForm((current) => ({ ...current, icon: value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Parent category</Label>
              <Select
                value={rootForm.parentId}
                onValueChange={(value) =>
                  setRootForm((current) => ({ ...current, parentId: value }))
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRootDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRootCategory}
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
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
                      current ? { ...current, name: event.target.value } : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <IconPicker
                  value={editingCategory.icon}
                  onChange={(value) =>
                    setEditingCategory((current) =>
                      current ? { ...current, icon: value } : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Parent</Label>
                <Select
                  value={editingCategory.parentId}
                  onValueChange={(value) =>
                    setEditingCategory((current) =>
                      current ? { ...current, parentId: value } : current
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
                <div className="flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
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
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={updateCategory.isPending}
            >
              {updateCategory.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete category?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" will be permanently removed. This only works if it has no subcategories or assigned courses/exams.`
            : ""
        }
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteCategory.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
