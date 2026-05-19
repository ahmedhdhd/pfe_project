"use client";

import { ExploreCourseCard } from "./explore-course-card";

type CategoryLike = {
  id?: string;
  name?: string;
  icon?: string | null;
  parentId?: string | null;
  parent?: CategoryLike | null;
};

interface ExploreTestSeriesCardProps {
  id: string;
  exam?: string | CategoryLike | null;
  category?: string | CategoryLike | null;
  title: string;
  description?: string | null;
  slug: string;
  imageUrl?: string;
  totalPrice: number;
  discountPercentage?: number;
  isFree?: boolean;
  durationDays?: number;
  index?: number;
}

const getCategoryLabel = (
  value?: string | CategoryLike | null
): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value.parent?.name && value.name) {
    return `${value.parent.name} / ${value.name}`;
  }

  return value.name;
};

export function ExploreTestSeriesCard(props: ExploreTestSeriesCardProps) {
  const categoryLabel =
    getCategoryLabel(props.category) || getCategoryLabel(props.exam);

  return (
    <ExploreCourseCard
      {...props}
      exam={undefined}
      category={categoryLabel}
      type="test-series"
      imageUrl={props.imageUrl}
      discountPercentage={props.discountPercentage ?? 0}
      isFree={props.isFree ?? false}
      durationDays={props.durationDays}
    />
  );
}
