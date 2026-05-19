"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Image as ImageIcon,
} from "lucide-react";
import { Question, QuestionType } from "@/hooks/test-series";
import { EditQuestionModal } from "./edit-question-modal";

interface QuestionItemProps {
  question: Question;
  index: number;
  onDelete: () => void;
  onRefetch: () => void;
}

const difficultyColors = {
  EASY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  MEDIUM:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  HARD: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

const typeLabels: Record<QuestionType, string> = {
  MCQ: "Multiple Choice",
  TRUE_FALSE: "True/False",
  FILL_BLANK: "Fill in the Blank",
  NUMERICAL: "Numerical",
};

export function QuestionItem({
  question,
  index,
  onDelete,
  onRefetch,
}: QuestionItemProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
      >
        <Card className="border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200 bg-background">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              {/* Question Number */}
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                </div>
              </div>

              {/* Question Content */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Question Text */}
                <div>
                  <h4 className="text-base font-semibold leading-relaxed text-foreground mb-2">
                    {question.text}
                  </h4>
                  {question.imageUrl && (
                    <div className="mt-3 relative group">
                      <img
                        src={question.imageUrl}
                        alt="Question"
                        className="max-w-md rounded-lg border-2 border-border shadow-sm hover:shadow-md transition-shadow"
                      />
                      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                        <ImageIcon className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Question Metadata */}
                <div className="flex items-center flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs font-medium bg-background border-border"
                  >
                    {typeLabels[question.type]}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold border ${difficultyColors[question.difficulty]}`}
                  >
                    {question.difficulty}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-xs font-medium bg-background border-border"
                  >
                    {question.marks} mark{question.marks !== 1 ? "s" : ""}
                  </Badge>
                  {question.negativeMarks > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs font-medium text-destructive bg-destructive/10 border-destructive/20"
                    >
                      -{question.negativeMarks} penalty
                    </Badge>
                  )}
                </div>

                {/* Options */}
                {question.options && question.options.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Options
                    </div>
                    {question.options.map((option, optIndex) => (
                      <motion.div
                        key={option.id || optIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: optIndex * 0.05 }}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${
                          option.isCorrect
                            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-sm"
                            : "bg-muted/50 border-border/50"
                        }`}
                      >
                        <div className="shrink-0 mt-0.5">
                          {option.isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground opacity-50" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-muted-foreground">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span
                              className={`text-sm ${
                                option.isCorrect
                                  ? "font-semibold text-emerald-900 dark:text-emerald-100"
                                  : "text-foreground"
                              }`}
                            >
                              {option.text}
                            </span>
                          </div>
                          {option.imageUrl && (
                            <img
                              src={option.imageUrl}
                              alt={`Option ${String.fromCharCode(65 + optIndex)}`}
                              className="mt-2 max-w-xs rounded border border-border/50"
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                {question.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-1">
                          Explanation
                        </div>
                        <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                          {question.explanation}
                        </p>
                      </div>
                    </div>
                    {question.explanationImageUrl && (
                      <img
                        src={question.explanationImageUrl}
                        alt="Explanation"
                        className="mt-3 max-w-md rounded border border-blue-200 dark:border-blue-800"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Actions Menu */}
              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:bg-muted"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => setIsEditModalOpen(true)}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive cursor-pointer focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <EditQuestionModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        question={question}
        onSuccess={() => {
          onRefetch();
          setIsEditModalOpen(false);
        }}
      />
    </>
  );
}
