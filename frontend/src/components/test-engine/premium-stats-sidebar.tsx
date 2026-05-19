"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle2, Flag, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PremiumStatsSidebarProps {
  answeredCount: number;
  totalQuestions: number;
  reviewCount: number;
  remainingMinutes: number;
  remainingSeconds: number;
  progressPercentage: number;
}

export function PremiumStatsSidebar({
  answeredCount,
  totalQuestions,
  reviewCount,
  remainingMinutes,
  remainingSeconds,
  progressPercentage,
}: PremiumStatsSidebarProps) {
  const isUrgent = remainingMinutes < 5;
  const formatTime = () => {
    const mins = typeof remainingMinutes === "number" && !isNaN(remainingMinutes) ? remainingMinutes : 0;
    const secs = typeof remainingSeconds === "number" && !isNaN(remainingSeconds) ? remainingSeconds : 0;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Progress Card */}
      <Card className="border shadow-md overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Progress</span>
            <span className="text-lg font-bold text-primary">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Answered</div>
                <div className="text-sm font-bold text-green-700 dark:text-green-400">
                  {answeredCount}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className="text-sm font-bold">
                  {totalQuestions - answeredCount}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time & Review Card */}
      <Card className="border shadow-md">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Clock className={cn(
              "h-5 w-5 shrink-0",
              isUrgent ? "text-red-600 dark:text-red-400" : "text-primary"
            )} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-0.5">Time Remaining</div>
              <div className={cn(
                "text-lg font-bold tabular-nums",
                isUrgent && "text-red-600 dark:text-red-400"
              )}>
                {formatTime()}
              </div>
            </div>
          </div>

          {reviewCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <Flag className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-0.5">Marked for Review</div>
                <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                  {reviewCount}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

