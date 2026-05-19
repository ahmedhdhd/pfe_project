"use client";

import { useState, useEffect } from "react";
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
import { Trash2, Plus } from "lucide-react";
import {
  useUpdateQuestion,
  Question,
  QuestionType,
  DifficultyLevel,
  QuestionOption,
} from "@/hooks/test-series";

const QUESTION_TYPES: QuestionType[] = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "NUMERICAL",
];
const DIFFICULTY_LEVELS: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD"];

interface EditQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question;
  onSuccess?: () => void;
}

export function EditQuestionModal({
  open,
  onOpenChange,
  question,
  onSuccess,
}: EditQuestionModalProps) {
  const [formData, setFormData] = useState({
    text: question.text,
    imageUrl: question.imageUrl || "",
    type: question.type,
    difficulty: question.difficulty,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    explanation: question.explanation || "",
    explanationImageUrl: question.explanationImageUrl || "",
    options:
      question.options ||
      ([
        { text: "", isCorrect: false, displayOrder: 0 },
        { text: "", isCorrect: false, displayOrder: 1 },
        { text: "", isCorrect: false, displayOrder: 2 },
        { text: "", isCorrect: false, displayOrder: 3 },
      ] as QuestionOption[]),
  });

  const updateMutation = useUpdateQuestion();

  useEffect(() => {
    if (question) {
      setFormData({
        text: question.text,
        imageUrl: question.imageUrl || "",
        type: question.type,
        difficulty: question.difficulty,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        explanation: question.explanation || "",
        explanationImageUrl: question.explanationImageUrl || "",
        options: question.options || [
          { text: "", isCorrect: false, displayOrder: 0 },
          { text: "", isCorrect: false, displayOrder: 1 },
          { text: "", isCorrect: false, displayOrder: 2 },
          { text: "", isCorrect: false, displayOrder: 3 },
        ],
      });
    }
  }, [question]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate options for MCQ
    if (formData.type === "MCQ" || formData.type === "TRUE_FALSE") {
      const filledOptions = formData.options.filter((opt) => opt.text.trim());
      if (filledOptions.length < 2) {
        alert("Please add at least 2 options");
        return;
      }
      const hasCorrect = filledOptions.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        alert("Please mark at least one option as correct");
        return;
      }
    }

    try {
      await updateMutation.mutateAsync({
        id: question.id,
        data: {
          text: formData.text,
          imageUrl: formData.imageUrl || undefined,
          type: formData.type,
          difficulty: formData.difficulty,
          marks: formData.marks,
          negativeMarks: formData.negativeMarks,
          explanation: formData.explanation || undefined,
          explanationImageUrl: formData.explanationImageUrl || undefined,
          options:
            formData.type === "MCQ" || formData.type === "TRUE_FALSE"
              ? formData.options.filter((opt) => opt.text.trim())
              : undefined,
        },
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update question:", error);
    }
  };

  const handleOptionChange = (
    index: number,
    field: "text" | "isCorrect",
    value: string | boolean
  ) => {
    const newOptions = [...formData.options];
    if (field === "text") {
      newOptions[index] = { ...newOptions[index], text: value as string };
    } else {
      newOptions[index] = { ...newOptions[index], isCorrect: value as boolean };
    }
    setFormData({ ...formData, options: newOptions });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [
        ...formData.options,
        {
          text: "",
          isCorrect: false,
          displayOrder: formData.options.length,
        },
      ],
    });
  };

  const removeOption = (index: number) => {
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>Update question details</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Type, Difficulty, Marks */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Question Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as QuestionType })
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
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    difficulty: value as DifficultyLevel,
                  })
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
              <Label htmlFor="marks">Marks</Label>
              <Input
                id="marks"
                type="number"
                min="1"
                value={formData.marks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    marks: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="text">Question Text</Label>
            <Textarea
              id="text"
              rows={3}
              value={formData.text}
              onChange={(e) =>
                setFormData({ ...formData, text: e.target.value })
              }
              required
            />
          </div>

          {/* Question Image */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl">Question Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
            />
          </div>

          {/* Negative Marks */}
          <div className="space-y-2">
            <Label htmlFor="negativeMarks">Negative Marks</Label>
            <Input
              id="negativeMarks"
              type="number"
              min="0"
              step="0.25"
              value={formData.negativeMarks}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  negativeMarks: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          {/* Options */}
          {(formData.type === "MCQ" || formData.type === "TRUE_FALSE") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                {formData.type === "MCQ" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-lg"
                  >
                    <input
                      type={
                        formData.type === "TRUE_FALSE" ? "radio" : "checkbox"
                      }
                      checked={option.isCorrect}
                      onChange={(e) =>
                        handleOptionChange(index, "isCorrect", e.target.checked)
                      }
                      className="h-4 w-4"
                    />
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={option.text}
                      onChange={(e) =>
                        handleOptionChange(index, "text", e.target.value)
                      }
                      className="flex-1"
                    />
                    {formData.type === "MCQ" && formData.options.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
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
            <Label htmlFor="explanation">Explanation</Label>
            <Textarea
              id="explanation"
              rows={3}
              value={formData.explanation}
              onChange={(e) =>
                setFormData({ ...formData, explanation: e.target.value })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
