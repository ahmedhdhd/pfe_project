"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flag, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumTestHeaderProps {
  remainingMinutes: number;
  remainingSeconds: number;
  currentIndex: number;
  totalQuestions: number;
  violations: number;
  maxViolations: number;
  markedForReview: boolean;
  onToggleReview: () => void;
  onSubmit: () => void;
}

export function PremiumTestHeader({
  remainingMinutes,
  remainingSeconds,
  currentIndex,
  totalQuestions,
  violations,
  maxViolations,
  markedForReview,
  onToggleReview,
  onSubmit,
}: PremiumTestHeaderProps) {
  const isUrgent = remainingMinutes < 5;
  const isCritical = remainingMinutes < 2;
  const showViolations = violations > 0;

  const formatTime = () => {
    const mins =
      typeof remainingMinutes === "number" && !isNaN(remainingMinutes)
        ? remainingMinutes
        : 0;
    const secs =
      typeof remainingSeconds === "number" && !isNaN(remainingSeconds)
        ? remainingSeconds
        : 0;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/90 shadow-lg"
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3 gap-4">
          {/* Left: Timer & Question Info */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Timer - Premium Design */}
            <motion.div
              animate={isUrgent ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1, repeat: isUrgent ? Infinity : 0 }}
            >
              <Badge
                variant={
                  isCritical
                    ? "destructive"
                    : isUrgent
                    ? "destructive"
                    : "secondary"
                }
                className={cn(
                  "gap-2 px-3 py-1.5 font-bold text-sm",
                  isUrgent && "animate-pulse shadow-lg",
                  isCritical && "bg-red-600 text-white"
                )}
              >
                <Clock className="h-4 w-4" />
                <span className="tabular-nums">{formatTime()}</span>
              </Badge>
            </motion.div>

            {/* Question Counter */}
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1.5 font-semibold"
            >
              <span className="text-muted-foreground">Q</span>
              <span className="text-foreground">{currentIndex + 1}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">{totalQuestions}</span>
            </Badge>

            {/* Violations Status */}
            {showViolations && maxViolations > 0 ? (
              <Badge
                variant="destructive"
                className="gap-1.5 px-3 py-1.5 animate-pulse"
              >
                <AlertCircle className="h-4 w-4" />
                <span>
                  {violations}/{maxViolations} violations
                </span>
              </Badge>
            ) : maxViolations > 0 ? (
              <Badge
                variant="outline"
                className="gap-1.5 px-3 py-1.5 border-green-500/50 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>No violations</span>
              </Badge>
            ) : null}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={markedForReview ? "default" : "outline"}
              size="sm"
              onClick={onToggleReview}
              className={cn(
                "gap-2 transition-all",
                markedForReview &&
                  "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
              )}
            >
              <Flag
                className={cn("h-4 w-4", markedForReview && "fill-current")}
              />
              {markedForReview ? "Marked" : "Mark"}
            </Button>
            <Button
              size="sm"
              onClick={onSubmit}
              className="gap-2 bg-primary hover:bg-primary/90 shadow-lg font-semibold"
            >
              <Send className="h-4 w-4" />
              Submit
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
