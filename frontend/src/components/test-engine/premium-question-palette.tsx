"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Flag, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PremiumQuestionPaletteProps {
  total: number;
  currentIndex: number;
  answeredMap: Record<number, boolean>;
  reviewMap: Record<number, boolean>;
  onSelect: (index: number) => void;
}

export function PremiumQuestionPalette({
  total,
  currentIndex,
  answeredMap,
  reviewMap,
  onSelect,
}: PremiumQuestionPaletteProps) {
  const answeredCount = Object.values(answeredMap).filter(Boolean).length;

  return (
    <Card className="border shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Question Palette
          </CardTitle>
          <div className="text-xs font-semibold text-muted-foreground">
            {answeredCount}/{total}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 mb-4">
          {Array.from({ length: total }).map((_, idx) => {
            const answered = Boolean(answeredMap[idx]);
            const isCurrent = idx === currentIndex;
            const review = Boolean(reviewMap[idx]);

            return (
              <motion.button
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  opacity: 1,
                }}
                whileHover={{ scale: isCurrent ? 1.1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "h-11 w-11 rounded-lg text-xs font-bold border-2 transition-all duration-200 flex items-center justify-center relative shadow-sm",
                  isCurrent
                    ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary/50 z-10"
                    : answered
                    ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 hover:shadow-md hover:scale-105"
                    : review
                    ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:shadow-md hover:scale-105"
                    : "bg-muted border-border hover:bg-muted/80 hover:border-primary/50 hover:shadow-md"
                )}
                onClick={() => onSelect(idx)}
              >
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-primary"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
                <span className="relative z-10">{idx + 1}</span>
                {answered && !isCurrent && (
                  <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 text-green-600 dark:text-green-400 bg-white dark:bg-background rounded-full" />
                )}
                {review && !isCurrent && !answered && (
                  <Flag className="absolute -top-1 -right-1 h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 bg-white dark:bg-background rounded-full" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs pt-3 border-t">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded border-2 border-primary bg-primary shadow-sm"></div>
            <span className="text-muted-foreground font-medium">Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded border-2 border-green-400 bg-green-100 dark:bg-green-900/30 shadow-sm"></div>
            <span className="text-muted-foreground font-medium">Answered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded border-2 border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 shadow-sm"></div>
            <span className="text-muted-foreground font-medium">Review</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
