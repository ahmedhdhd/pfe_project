"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Flag } from "lucide-react";

// Grid of question buttons showing current/answered/review states
export function QuestionPalette({
  total,
  currentIndex,
  answeredMap,
  reviewMap,
  onSelect,
}: {
  total: number;
  currentIndex: number;
  answeredMap: Record<number, boolean>;
  reviewMap: Record<number, boolean>;
  onSelect: (index: number) => void;
}) {
  const answeredCount = Object.values(answeredMap).filter(Boolean).length;
  
  return (
    <div className="border rounded-lg p-3 bg-card shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Question Palette</div>
        <div className="text-xs text-muted-foreground">
          {answeredCount}/{total}
        </div>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
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
                opacity: 1 
              }}
              whileHover={{ scale: isCurrent ? 1.1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={
                "h-10 w-10 rounded-lg text-xs font-semibold border-2 transition-all duration-200 flex items-center justify-center relative " +
                (isCurrent
                  ? "bg-primary text-primary-foreground border-primary shadow-lg ring-2 ring-primary/50"
                  : answered
                  ? "bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 hover:shadow-md"
                  : review
                  ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:shadow-md"
                  : "bg-muted border-border hover:bg-muted/80 hover:border-primary/50")
              }
              onClick={() => onSelect(idx)}
            >
              {isCurrent && (
                <motion.div
                  className="absolute inset-0 rounded-lg border-2 border-primary"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <span className="relative z-10">{idx + 1}</span>
              {answered && !isCurrent && (
                <CheckCircle2 className="absolute -top-1 -right-1 h-3 w-3 text-green-600 dark:text-green-400" />
              )}
              {review && !isCurrent && !answered && (
                <Flag className="absolute -top-1 -right-1 h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              )}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border-2 border-primary bg-primary"></div>
          <span className="text-muted-foreground">Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border-2 border-green-400 bg-green-100 dark:bg-green-900/30"></div>
          <span className="text-muted-foreground">Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded border-2 border-yellow-400 bg-yellow-100 dark:bg-yellow-900/30"></div>
          <span className="text-muted-foreground">Review</span>
        </div>
      </div>
    </div>
  );
}
