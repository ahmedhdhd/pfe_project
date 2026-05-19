"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  question: {
    id: string;
    text: string;
    type: "MCQ" | "TRUE_FALSE" | "NUMERICAL" | "FILL_BLANK";
    imageUrl?: string;
    options?: Array<{ id: string; text: string; imageUrl?: string }>;
    marks?: number;
    negativeMarks?: number;
  };
  value: unknown;
  onChange: (value: unknown) => void;
};

export function QuestionRenderer({ question, value, onChange }: Props) {
  if (question.type === "MCQ") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-lg border hover:shadow-xl transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border-b p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs font-medium px-2 py-0.5"
                >
                  Multiple Choice
                </Badge>
                {value !== undefined && value !== null && value !== "" && (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Answered
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {question.marks !== undefined && (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  >
                    +{question.marks} marks
                  </Badge>
                )}
                {question.negativeMarks !== undefined &&
                  question.negativeMarks > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                    >
                      -{question.negativeMarks} marks
                    </Badge>
                  )}
              </div>
            </div>
            <CardTitle className="text-xl font-bold leading-relaxed text-foreground">
              {question.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {question.imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6 relative w-full h-60 sm:h-80 border-2 rounded-xl overflow-hidden bg-muted/30 shadow-inner cursor-pointer hover:border-primary/50 transition-all group"
              >
                <Image
                  src={question.imageUrl}
                  alt="Question"
                  fill
                  sizes="(max-width: 640px) 100vw, 800px"
                  style={{ objectFit: "contain" }}
                  className="p-3 group-hover:scale-105 transition-transform duration-300"
                  onClick={() =>
                    window.open(question.imageUrl as string, "_blank")
                  }
                />
              </motion.div>
            )}
            <RadioGroup
              value={(value as string) ?? ""}
              onValueChange={(v) => onChange(v)}
              className="space-y-3"
            >
              {question.options?.map((opt, idx) => {
                const isSelected = value === opt.id;
                return (
                  <motion.div
                    key={opt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                    whileHover={{ x: 4, scale: 1.01 }}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer group",
                      isSelected
                        ? "bg-primary/10 border-primary shadow-lg ring-2 ring-primary/20"
                        : "bg-card border-border hover:border-primary/50 hover:bg-muted/50 hover:shadow-md"
                    )}
                  >
                    <RadioGroupItem
                      id={`${question.id}-${opt.id}`}
                      value={opt.id}
                      className="mt-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`${question.id}-${opt.id}`}
                        className="text-base font-medium cursor-pointer leading-relaxed"
                      >
                        {opt.text}
                      </Label>
                      {opt.imageUrl && (
                        <div className="mt-3 relative w-full h-40 border-2 rounded-lg overflow-hidden bg-muted/30 hover:border-primary/50 transition-colors group/image">
                          <Image
                            src={opt.imageUrl}
                            alt="Option"
                            fill
                            sizes="(max-width: 640px) 100vw, 600px"
                            style={{ objectFit: "contain" }}
                            className="p-2 group-hover/image:scale-105 transition-transform duration-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(opt.imageUrl as string, "_blank");
                            }}
                          />
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="text-primary shrink-0"
                      >
                        <CheckCircle2 className="h-6 w-6" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (question.type === "TRUE_FALSE") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-lg border hover:shadow-xl transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border-b p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs font-medium px-2 py-0.5"
                >
                  True/False
                </Badge>
                {value !== undefined && value !== null && value !== "" && (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Answered
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {question.marks !== undefined && (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  >
                    +{question.marks} marks
                  </Badge>
                )}
                {question.negativeMarks !== undefined &&
                  question.negativeMarks > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                    >
                      -{question.negativeMarks} marks
                    </Badge>
                  )}
              </div>
            </div>
            <CardTitle className="text-xl font-bold leading-relaxed text-foreground">
              {question.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {question.imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6 relative w-full h-60 sm:h-80 border-2 rounded-xl overflow-hidden bg-muted/30 shadow-inner cursor-pointer hover:border-primary/50 transition-all group"
              >
                <img
                  src={question.imageUrl}
                  alt="Question"
                  className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                  onClick={() =>
                    window.open(question.imageUrl as string, "_blank")
                  }
                />
              </motion.div>
            )}
            <RadioGroup
              value={(value as string) ?? ""}
              onValueChange={(v) => onChange(v)}
              className="space-y-4"
            >
              {(() => {
                // If options array is empty, create default True/False options
                const options =
                  (question.options || []).length > 0
                    ? question.options!
                    : [
                        { id: "TRUE", text: "True" },
                        { id: "FALSE", text: "False" },
                      ];

                return options.map((opt, idx) => {
                  const isSelected = value === opt.id;
                  // Determine color based on option text (True = green, False = red)
                  const isTrue = opt.text.toLowerCase().trim() === "true";
                  const optColor = isTrue ? "green" : "red";

                  return (
                    <motion.div
                      key={opt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      whileHover={{ x: 4, scale: 1.02 }}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border-2 transition-all cursor-pointer",
                        isSelected
                          ? optColor === "green"
                            ? "bg-green-50 dark:bg-green-900/20 border-green-500 shadow-lg ring-2 ring-green-500/20"
                            : "bg-red-50 dark:bg-red-900/20 border-red-500 shadow-lg ring-2 ring-red-500/20"
                          : "bg-card border-border hover:border-primary/50 hover:bg-muted/50 hover:shadow-md"
                      )}
                    >
                      <RadioGroupItem
                        id={`${question.id}-${opt.id}`}
                        value={opt.id}
                        className="shrink-0"
                      />
                      <Label
                        htmlFor={`${question.id}-${opt.id}`}
                        className="text-lg font-bold cursor-pointer flex-1"
                      >
                        {opt.text}
                      </Label>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className={cn(
                            "shrink-0",
                            optColor === "green"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          <CheckCircle2 className="h-6 w-6" />
                        </motion.div>
                      )}
                    </motion.div>
                  );
                });
              })()}
            </RadioGroup>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Numerical and Fill in the blank
  if (question.type === "NUMERICAL" || question.type === "FILL_BLANK") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="shadow-lg border hover:shadow-xl transition-all duration-300 overflow-hidden">
          <CardHeader className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border-b p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs font-medium px-2 py-0.5"
                >
                  {question.type === "NUMERICAL"
                    ? "Numerical"
                    : "Fill in the Blank"}
                </Badge>
                {value !== undefined && value !== null && value !== "" && (
                  <Badge
                    variant="secondary"
                    className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Answered
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {question.marks !== undefined && (
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  >
                    +{question.marks} marks
                  </Badge>
                )}
                {question.negativeMarks !== undefined &&
                  question.negativeMarks > 0 && (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold px-2 py-0.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
                    >
                      -{question.negativeMarks} marks
                    </Badge>
                  )}
              </div>
            </div>
            <CardTitle className="text-xl font-bold leading-relaxed text-foreground">
              {question.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {question.imageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-6 relative w-full h-60 sm:h-80 border-2 rounded-xl overflow-hidden bg-muted/30 shadow-inner"
              >
                <img
                  src={question.imageUrl}
                  alt="Question"
                  className="w-full h-full object-contain p-3"
                />
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <Label
                htmlFor={`${question.id}-answer`}
                className="text-sm font-semibold text-foreground"
              >
                Your Answer:
              </Label>
              <input
                id={`${question.id}-answer`}
                type={question.type === "NUMERICAL" ? "number" : "text"}
                value={(value as string) ?? ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder={
                  question.type === "NUMERICAL"
                    ? "Enter a number"
                    : "Type your answer here"
                }
                className="w-full px-5 py-4 text-lg border-2 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-background font-medium"
              />
              {value !== undefined && value !== null && value !== "" && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 font-medium"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Answer saved
                </motion.p>
              )}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Fallback
  return (
    <Card className="shadow-lg border-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{question.text}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Unsupported question type</p>
      </CardContent>
    </Card>
  );
}
