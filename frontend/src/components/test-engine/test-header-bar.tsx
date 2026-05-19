"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Flag, Send, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

// Displays timer, question position, violations, and actions
export function TestHeaderBar({
  remainingMinutes,
  remainingSeconds,
  currentIndex,
  totalQuestions,
  violations,
  maxViolations,
  markedForReview,
  onToggleReview,
  onSubmit,
}: {
  remainingMinutes: number;
  remainingSeconds: number;
  currentIndex: number;
  totalQuestions: number;
  violations: number;
  maxViolations: number;
  markedForReview: boolean;
  onToggleReview: () => void;
  onSubmit: () => void;
}) {
  const isUrgent = remainingMinutes < 5;
  const showViolations = violations > 0;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm"
    >
      <div className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap">
        <Badge
          variant={isUrgent ? "destructive" : "secondary"}
          className={`gap-1 font-semibold ${
            isUrgent ? "animate-pulse" : ""
          }`}
        >
          <Clock className="h-3.5 w-3.5" />{" "}
          {typeof remainingMinutes === "number" && !isNaN(remainingMinutes)
            ? `${remainingMinutes}:${String(remainingSeconds).padStart(2, "0")}`
            : "00:00"}
        </Badge>
        <Badge variant="outline" className="font-medium">
          Q {currentIndex + 1} / {totalQuestions}
        </Badge>
        {showViolations && maxViolations > 0 && (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" /> {violations}/{maxViolations}
          </Badge>
        )}
        {!showViolations && maxViolations > 0 && (
          <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> No violations
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant={markedForReview ? "default" : "outline"}
          size="sm"
          onClick={onToggleReview}
          className="transition-all"
        >
          <Flag className={`mr-2 h-4 w-4 ${markedForReview ? "text-yellow-300" : ""}`} />
          {markedForReview ? "Marked" : "Mark"}
        </Button>
        <Button 
          size="sm" 
          onClick={onSubmit}
          className="bg-primary hover:bg-primary/90 shadow-lg"
        >
          <Send className="mr-2 h-4 w-4" /> Submit
        </Button>
      </div>
    </motion.div>
  );
}
