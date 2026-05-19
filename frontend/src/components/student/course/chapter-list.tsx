"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Chapter, CourseContent } from "./types";
import { ContentItem } from "./content-item";
import { cn } from "@/lib/utils";

interface ChapterListProps {
  chapters: Chapter[];
  onContentSelect: (content: CourseContent) => void;
}

export function ChapterList({ chapters, onContentSelect }: ChapterListProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  if (chapters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center text-muted-foreground">
            No content available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Content</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      expandedChapters.has(chapter.id) && "rotate-90"
                    )}
                  />
                  <span className="font-medium">{chapter.name}</span>
                </div>
                <Badge variant="secondary">
                  {chapter.topics?.length || 0} topics
                </Badge>
              </button>

              {expandedChapters.has(chapter.id) && (
                <div className="border-t p-4 space-y-2">
                  {chapter.topics?.map((topic) => (
                    <div key={topic.id} className="space-y-2">
                      <div className="font-medium text-sm">{topic.name}</div>
                      <div className="space-y-1">
                        {topic.contents?.map((content) => (
                          <ContentItem
                            key={content.id}
                            content={content}
                            onClick={onContentSelect}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
