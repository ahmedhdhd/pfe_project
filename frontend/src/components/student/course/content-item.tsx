"use client";

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CourseContent } from "./types";
import { getContentTypeIcon, getContentTypeColor } from "./utils";
import { cn } from "@/lib/utils";

interface ContentItemProps {
  content: CourseContent;
  onClick: (content: CourseContent) => void;
}

export function ContentItem({ content, onClick }: ContentItemProps) {
  const Icon = getContentTypeIcon(content.type);

  return (
    <button
      onClick={() => onClick(content)}
      className={cn(
        "w-full flex items-center justify-between p-3",
        "hover:bg-muted/50 rounded transition-colors text-left"
      )}
    >
      <div className="flex items-center space-x-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{content.name}</span>
        <Badge
          variant="secondary"
          className={cn("text-xs", getContentTypeColor(content.type))}
        >
          {content.type}
        </Badge>
      </div>
      {content.isCompleted && (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      )}
    </button>
  );
}
