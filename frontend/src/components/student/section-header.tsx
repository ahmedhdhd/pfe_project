"use client";

import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  icon: LucideIcon;
  viewAllHref?: string;
  viewAllText?: string;
}

export function SectionHeader({
  title,
  icon: Icon,
  viewAllHref,
  viewAllText = "View All",
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3 sm:mb-4 gap-3">
      <h2 className={cn(
        "text-lg sm:text-xl md:text-2xl font-bold",
        "flex items-center gap-2",
        "text-foreground"
      )}>
        <div className={cn(
          "p-1.5 sm:p-2 rounded-lg",
          "bg-primary/10 dark:bg-primary/20",
          "text-primary"
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
        </div>
        <span>{title}</span>
      </h2>
      {viewAllHref && (
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "text-xs sm:text-sm",
            "h-8 px-2 sm:px-3",
            "text-muted-foreground hover:text-primary",
            "shrink-0"
          )}
          asChild
        >
          <Link href={viewAllHref} className="flex items-center gap-1">
            <span className="hidden sm:inline">{viewAllText}</span>
            <span className="sm:hidden">All</span>
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
