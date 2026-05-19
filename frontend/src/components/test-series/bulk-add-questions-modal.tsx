"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import {
  useBulkCreateSectionQuestions,
  QuestionType,
  DifficultyLevel,
  QuestionOption,
} from "@/hooks/test-series";

interface BulkAddQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  onSuccess?: () => void;
}

const QUESTION_TYPES: QuestionType[] = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "NUMERICAL",
];
const DIFFICULTY_LEVELS: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD"];

interface QuestionFormData {
  text: string;
  imageUrl: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  marks: number;
  negativeMarks: number;
  explanation: string;
  explanationImageUrl: string;
  options: QuestionOption[];
}

export function BulkAddQuestionsModal({
  open,
  onOpenChange,
  sectionId,
  onSuccess,
}: BulkAddQuestionsModalProps) {
  const [questions, setQuestions] = useState<QuestionFormData[]>([
    {
      text: "",
      imageUrl: "",
      type: "MCQ",
      difficulty: "MEDIUM",
      marks: 1,
      negativeMarks: 0.25,
      explanation: "",
      explanationImageUrl: "",
      options: [
        { text: "", isCorrect: false, displayOrder: 0 },
        { text: "", isCorrect: false, displayOrder: 1 },
        { text: "", isCorrect: false, displayOrder: 2 },
        { text: "", isCorrect: false, displayOrder: 3 },
      ],
    },
  ]);

  const bulkMutation = useBulkCreateSectionQuestions();

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: "",
        imageUrl: "",
        type: "MCQ",
        difficulty: "MEDIUM",
        marks: 1,
        negativeMarks: 0.25,
        explanation: "",
        explanationImageUrl: "",
        options: [
          { text: "", isCorrect: false, displayOrder: 0 },
          { text: "", isCorrect: false, displayOrder: 1 },
          { text: "", isCorrect: false, displayOrder: 2 },
          { text: "", isCorrect: false, displayOrder: 3 },
        ],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (
    index: number,
    field: keyof QuestionFormData,
    value: QuestionFormData[keyof QuestionFormData]
  ) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    field: "text" | "isCorrect",
    value: string | boolean
  ) => {
    const newQuestions = [...questions];
    const newOptions = [...newQuestions[questionIndex].options];
    if (field === "text") {
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        text: value as string,
      };
    } else {
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        isCorrect: value as boolean,
      };
    }
    newQuestions[questionIndex].options = newOptions;
    setQuestions(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options.push({
      text: "",
      isCorrect: false,
      displayOrder: newQuestions[questionIndex].options.length,
    });
    setQuestions(newQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options = newQuestions[
      questionIndex
    ].options.filter((_, i) => i !== optionIndex);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        alert(`Question ${i + 1}: Please enter question text`);
        return;
      }

      if (q.type === "MCQ" || q.type === "TRUE_FALSE") {
        const filledOptions = q.options.filter((opt) => opt.text.trim());
        if (filledOptions.length < 2) {
          alert(`Question ${i + 1}: Please add at least 2 options`);
          return;
        }
        const hasCorrect = filledOptions.some((opt) => opt.isCorrect);
        if (!hasCorrect) {
          alert(
            `Question ${i + 1}: Please mark at least one option as correct`
          );
          return;
        }
      }
    }

    // Create all questions in bulk
    try {
      await bulkMutation.mutateAsync({
        sectionId,
        questions: questions.map((q) => ({
          text: q.text,
          imageUrl: q.imageUrl || undefined,
          type: q.type,
          difficulty: q.difficulty,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          explanation: q.explanation || undefined,
          options:
            q.type === "MCQ" || q.type === "TRUE_FALSE"
              ? q.options
                  .filter((opt) => opt.text.trim())
                  .map((opt) => ({ text: opt.text, isCorrect: opt.isCorrect }))
              : undefined,
        })),
      });

      // Reset form
      setQuestions([
        {
          text: "",
          imageUrl: "",
          type: "MCQ",
          difficulty: "MEDIUM",
          marks: 1,
          negativeMarks: 0.25,
          explanation: "",
          explanationImageUrl: "",
          options: [
            { text: "", isCorrect: false, displayOrder: 0 },
            { text: "", isCorrect: false, displayOrder: 1 },
            { text: "", isCorrect: false, displayOrder: 2 },
            { text: "", isCorrect: false, displayOrder: 3 },
          ],
        },
      ]);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create questions:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold">
            Bulk Add Questions
          </DialogTitle>
          <DialogDescription>
            Add multiple questions at once to this section
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question, qIndex) => (
              <div
                key={qIndex}
                className="border-2 border-border rounded-lg p-5 bg-muted/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {qIndex + 1}
                      </span>
                    </div>
                    <h3 className="font-semibold">Question {qIndex + 1}</h3>
                  </div>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeQuestion(qIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Question Type, Difficulty, Marks */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Question Type</Label>
                      <Select
                        value={question.type}
                        onValueChange={(value) =>
                          updateQuestion(qIndex, "type", value as QuestionType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUESTION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select
                        value={question.difficulty}
                        onValueChange={(value) =>
                          updateQuestion(
                            qIndex,
                            "difficulty",
                            value as DifficultyLevel
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTY_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Marks</Label>
                      <Input
                        type="number"
                        min="1"
                        value={question.marks}
                        onChange={(e) =>
                          updateQuestion(
                            qIndex,
                            "marks",
                            parseInt(e.target.value) || 1
                          )
                        }
                        required
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Textarea
                      placeholder="Enter your question here..."
                      rows={2}
                      value={question.text}
                      onChange={(e) =>
                        updateQuestion(qIndex, "text", e.target.value)
                      }
                      required
                    />
                  </div>

                  {/* Question Image */}
                  <div className="space-y-2">
                    <Label>Question Image URL</Label>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={question.imageUrl}
                      onChange={(e) =>
                        updateQuestion(qIndex, "imageUrl", e.target.value)
                      }
                    />
                  </div>

                  {/* Negative Marks */}
                  <div className="space-y-2">
                    <Label>Negative Marks</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      value={question.negativeMarks}
                      onChange={(e) =>
                        updateQuestion(
                          qIndex,
                          "negativeMarks",
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>

                  {/* Options */}
                  {(question.type === "MCQ" ||
                    question.type === "TRUE_FALSE") && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        {question.type === "MCQ" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(qIndex)}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Option
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className="flex items-center gap-2 p-3 border rounded-lg"
                          >
                            <input
                              type={
                                question.type === "TRUE_FALSE"
                                  ? "radio"
                                  : "checkbox"
                              }
                              checked={option.isCorrect}
                              onChange={(e) =>
                                updateOption(
                                  qIndex,
                                  optIndex,
                                  "isCorrect",
                                  e.target.checked
                                )
                              }
                              className="h-4 w-4"
                            />
                            <Input
                              placeholder={`Option ${String.fromCharCode(
                                65 + optIndex
                              )}`}
                              value={option.text}
                              onChange={(e) =>
                                updateOption(
                                  qIndex,
                                  optIndex,
                                  "text",
                                  e.target.value
                                )
                              }
                              className="flex-1"
                            />
                            {question.type === "MCQ" &&
                              question.options.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(qIndex, optIndex)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  <div className="space-y-2">
                    <Label>Explanation</Label>
                    <Textarea
                      placeholder="Explain the correct answer..."
                      rows={2}
                      value={question.explanation}
                      onChange={(e) =>
                        updateQuestion(qIndex, "explanation", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Question
            </Button>

            <DialogFooter className="flex-shrink-0 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={bulkMutation.isPending}>
                {bulkMutation.isPending
                  ? "Uploading..."
                  : `Create ${questions.length} Question${
                      questions.length !== 1 ? "s" : ""
                    }`}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
