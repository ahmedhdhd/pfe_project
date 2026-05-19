"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export interface HorizontalListItemCardProps {
  /** Unique identifier for the item */
  id: string;
  /** Display name/title of the item */
  name: string;
  /** Link URL for navigation */
  href: string;
  /** Item number/index (1-based) */
  index: number;
  /** Optional subtitle or metadata to display below the name */
  subtitle?: ReactNode;
  /** Animation delay for staggered animations */
  animationDelay?: number;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Reusable horizontal list item card component
 *
 * Used for displaying items in a horizontal list format with:
 * - Number badge on the left
 * - Name and subtitle in the center
 * - Chevron icon on the right
 *
 * @example
 * ```tsx
 * <HorizontalListItemCard
 *   id="chapter-1"
 *   name="Introduction to Biology"
 *   href="/chapters/1"
 *   index={1}
 *   subtitle={<ChapterTopicCount chapterId="chapter-1" />}
 * />
 * ```
 */
export function HorizontalListItemCard({
  id,
  name,
  href,
  index,
  subtitle,
  animationDelay = 0,
  className,
}: HorizontalListItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: animationDelay }}
    >
      <Link href={href} className="block">
        <Card
          className={`group bg-card/95 text-card-foreground rounded-xl border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer ${
            className || ""
          }`}
        >
          <CardContent className="p-0 px-4 py-3.5 flex items-center gap-3">
            {/* Left: Number Badge */}
            <div className="shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 dark:from-primary/20 dark:to-primary/10 flex items-center justify-center border-2 border-primary/30 group-hover:border-primary/50 group-hover:from-primary/25 group-hover:to-primary/10 transition-all shadow-sm">
                <span className="text-sm font-bold text-primary">{index}</span>
              </div>
            </div>

            {/* Center: Name and Subtitle */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors truncate">
                {name}
              </h3>
              {subtitle && <div>{subtitle}</div>}
            </div>

            {/* Right: Chevron Icon */}
            <div className="shrink-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted/50 group-hover:bg-primary/10 transition-colors">
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
