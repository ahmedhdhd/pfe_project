"use client";

import {
  BookOpen,
  Briefcase,
  Calculator,
  Code2,
  FlaskConical,
  Globe,
  GraduationCap,
  HeartPulse,
  Landmark,
  LucideIcon,
  PenTool,
  Scale,
  Tag,
} from "lucide-react";

export type CategoryIconName =
  | "BookOpen"
  | "GraduationCap"
  | "Code2"
  | "Calculator"
  | "FlaskConical"
  | "HeartPulse"
  | "Scale"
  | "Landmark"
  | "Briefcase"
  | "PenTool"
  | "Globe"
  | "Tag";

export interface CategoryOption {
  id: string;
  name: string;
  icon?: string | null;
  parentId?: string | null;
  parent?: CategoryOption | null;
  children?: CategoryOption[];
  _count?: {
    batches?: number;
    testSeries?: number;
    children?: number;
  };
}

export const CATEGORY_ICON_MAP: Record<CategoryIconName, LucideIcon> = {
  BookOpen,
  GraduationCap,
  Code2,
  Calculator,
  FlaskConical,
  HeartPulse,
  Scale,
  Landmark,
  Briefcase,
  PenTool,
  Globe,
  Tag,
};

export const CATEGORY_ICON_OPTIONS: Array<{
  value: CategoryIconName;
  label: string;
}> = [
  { value: "BookOpen", label: "Learning" },
  { value: "GraduationCap", label: "Academics" },
  { value: "Code2", label: "Technology" },
  { value: "Calculator", label: "Mathematics" },
  { value: "FlaskConical", label: "Science" },
  { value: "HeartPulse", label: "Medical" },
  { value: "Scale", label: "Law" },
  { value: "Landmark", label: "Civil Services" },
  { value: "Briefcase", label: "Business" },
  { value: "PenTool", label: "Design" },
  { value: "Globe", label: "Languages" },
  { value: "Tag", label: "General" },
];

export const getCategoryIcon = (iconName?: string | null): LucideIcon =>
  CATEGORY_ICON_MAP[(iconName as CategoryIconName) || "Tag"] || Tag;

export const getCategoryBranch = (category?: CategoryOption | null) => {
  if (!category) {
    return {
      category: null,
      subcategory: null,
    };
  }

  if (category.parent) {
    return {
      category: category.parent,
      subcategory: category,
    };
  }

  return {
    category,
    subcategory: null,
  };
};

export const formatCategoryLabel = (category?: CategoryOption | null) => {
  const branch = getCategoryBranch(category);

  if (branch.category && branch.subcategory) {
    return `${branch.category.name} / ${branch.subcategory.name}`;
  }

  return branch.category?.name || "";
};

export const sortCategories = (categories: CategoryOption[]) =>
  [...categories].sort((a, b) => a.name.localeCompare(b.name));

export const getRootCategories = (categories: CategoryOption[]) =>
  sortCategories(categories.filter((category) => !category.parentId));

export const getChildCategories = (
  categories: CategoryOption[],
  parentId?: string | null
) =>
  sortCategories(
    categories.filter((category) => (category.parentId || null) === (parentId || null))
  );

export const resolveAssignedCategoryId = (
  selectedCategoryId?: string | null,
  selectedSubcategoryId?: string | null
) => selectedSubcategoryId || selectedCategoryId || "";
