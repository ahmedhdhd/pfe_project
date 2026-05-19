"use client";

import { ExploreCourseCard } from "./explore-course-card";
import { formatCategoryLabel } from "@/lib/categories";

interface ExploreBatchCardProps {
  id: string;
  name: string;
  class?: "11" | "12" | "12+" | "Grad" | string;
  exam?: string;
  category?: {
    id: string;
    name: string;
    icon?: string | null;
    parentId?: string | null;
    parent?: {
      id: string;
      name: string;
      icon?: string | null;
      parentId?: string | null;
    } | null;
  } | null;
  startDate: Date | string;
  endDate: Date | string;
  language: string;
  totalPrice: number;
  discountPercentage: number;
  teachers?: Array<{ id: string; name: string; imageUrl?: string }>;
  features?: string[];
  isCombo?: boolean;
  planType?: string;
  index?: number;
}

export function ExploreBatchCard(props: ExploreBatchCardProps) {
  return (
    <ExploreCourseCard
      {...props}
      title={props.name}
      category={formatCategoryLabel(props.category)}
      type="batch"
      class={props.class}
      startDate={props.startDate}
      endDate={props.endDate}
      language={props.language}
    />
  );
}
