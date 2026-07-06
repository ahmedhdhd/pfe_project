"use client";

import * as OutlineIcons from "@heroicons/react/24/outline";
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
} from "@/components/icons";

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

const HERO_ICONS = OutlineIcons as unknown as Record<string, LucideIcon>;

// Every icon in the project's icon library (Heroicons 24/outline), listed for
// the category icon picker. Values are stored without the "Icon" suffix.
export const ALL_CATEGORY_ICONS: Array<{
  value: string;
  label: string;
  Icon: LucideIcon;
}> = Object.keys(HERO_ICONS)
  .filter((name) => name.endsWith("Icon"))
  .map((name) => {
    const value = name.replace(/Icon$/, "");
    return {
      value,
      label: value.replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
      Icon: HERO_ICONS[name],
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

// Resolves both legacy names ("FlaskConical", "PenTool", ...) and any
// Heroicons outline name stored without its "Icon" suffix ("AcademicCap").
export const getCategoryIcon = (iconName?: string | null): LucideIcon => {
  if (!iconName) return Tag;
  const legacy = CATEGORY_ICON_MAP[iconName as CategoryIconName];
  if (legacy) return legacy;
  return HERO_ICONS[`${iconName}Icon`] || HERO_ICONS[iconName] || Tag;
};

export const getCategoryIconLabel = (iconName?: string | null): string => {
  if (!iconName) return "Tag";
  return iconName.replace(/Icon$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
};

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

export interface CategoryColorSlot {
  dot: string;
  soft: string;
  text: string;
}

// Fixed hue order, validated for CVD-safe adjacency — see dataviz palette reference.
const CATEGORY_COLOR_SLOTS: CategoryColorSlot[] = [
  {
    dot: "bg-[#2a78d6] dark:bg-[#3987e5]",
    soft: "bg-[#2a78d6]/10 dark:bg-[#3987e5]/15",
    text: "text-[#2a78d6] dark:text-[#3987e5]",
  },
  {
    dot: "bg-[#1baf7a] dark:bg-[#199e70]",
    soft: "bg-[#1baf7a]/10 dark:bg-[#199e70]/15",
    text: "text-[#1baf7a] dark:text-[#199e70]",
  },
  {
    dot: "bg-[#eda100] dark:bg-[#c98500]",
    soft: "bg-[#eda100]/10 dark:bg-[#c98500]/15",
    text: "text-[#eda100] dark:text-[#c98500]",
  },
  {
    dot: "bg-[#008300] dark:bg-[#008300]",
    soft: "bg-[#008300]/10 dark:bg-[#008300]/15",
    text: "text-[#008300] dark:text-[#008300]",
  },
  {
    dot: "bg-[#4a3aa7] dark:bg-[#9085e9]",
    soft: "bg-[#4a3aa7]/10 dark:bg-[#9085e9]/15",
    text: "text-[#4a3aa7] dark:text-[#9085e9]",
  },
  {
    dot: "bg-[#e34948] dark:bg-[#e66767]",
    soft: "bg-[#e34948]/10 dark:bg-[#e66767]/15",
    text: "text-[#e34948] dark:text-[#e66767]",
  },
  {
    dot: "bg-[#e87ba4] dark:bg-[#d55181]",
    soft: "bg-[#e87ba4]/10 dark:bg-[#d55181]/15",
    text: "text-[#e87ba4] dark:text-[#d55181]",
  },
  {
    dot: "bg-[#eb6834] dark:bg-[#d95926]",
    soft: "bg-[#eb6834]/10 dark:bg-[#d95926]/15",
    text: "text-[#eb6834] dark:text-[#d95926]",
  },
];

export const getCategoryColor = (id: string): CategoryColorSlot => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_COLOR_SLOTS[hash % CATEGORY_COLOR_SLOTS.length];
};
