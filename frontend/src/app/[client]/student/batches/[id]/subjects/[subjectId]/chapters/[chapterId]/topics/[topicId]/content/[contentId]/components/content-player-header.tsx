"use client";

import {
  ArrowLeft,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContentPlayerHeaderProps {
  contentName: string;
  contentDescription?: string;
  chapterName?: string;
  topicName?: string;
  isCompleted: boolean;
  isMarkingComplete: boolean;
  onGoBack: () => void;
  onToggleSidebar: () => void;
  onMarkAsComplete: () => void;
  sidebarOpen: boolean;
  onToggleAi?: () => void;
  isAiOpen?: boolean;
  showCompletionAction?: boolean;
}

export function ContentPlayerHeader({
  contentName,
  contentDescription,
  chapterName,
  topicName,
  isCompleted,
  isMarkingComplete,
  onGoBack,
  onToggleSidebar,
  onMarkAsComplete,
  sidebarOpen,
  onToggleAi,
  isAiOpen,
  showCompletionAction = true,
}: ContentPlayerHeaderProps) {
  return (
    <div className="border-b border-border/60 bg-background shrink-0 sticky top-0 z-10 backdrop-blur-sm">
      <div className="container max-w-[1920px] mx-auto px-4 py-3 md:py-4 space-y-2">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onGoBack}
            className="hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 hidden md:inline-flex">
                {chapterName || "Chapter"}
              </Badge>
              <span className="text-xs text-muted-foreground truncate hidden md:inline-block">
                •
              </span>
              <span className="text-xs text-muted-foreground truncate font-medium">
                {topicName || "Topic"}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground truncate tracking-tight">
              {contentName}
            </h1>
            {contentDescription && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1 hidden md:block">
                {contentDescription}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {showCompletionAction ? (
              <Button
                variant={isCompleted ? "outline" : "default"}
                size="sm"
                onClick={onMarkAsComplete}
                disabled={isCompleted || isMarkingComplete}
                className="rounded-full shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {isCompleted
                  ? "Completed"
                  : isMarkingComplete
                    ? "Marking..."
                    : isMarkingComplete
                    ? "Marking..."
                    : "Mark as Complete"}
              </Button>
            ) : null}

            {onToggleAi && (
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleAi}
                className={`rounded-full border-border/60 hover:bg-primary/10 transition-colors ${
                  isAiOpen ? "bg-primary/10 text-primary border-primary/30" : ""
                }`}
                title="AI Tutor"
              >
                <Sparkles className={`h-5 w-5 ${isAiOpen ? "text-primary" : "text-muted-foreground"}`} />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleSidebar}
              className="rounded-full border-border/60 hover:bg-muted"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
