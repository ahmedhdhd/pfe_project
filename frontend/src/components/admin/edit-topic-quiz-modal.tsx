"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TopicQuiz, TopicQuizQuestionType } from "@/hooks/api";
import { useUpdateTopicQuiz } from "@/hooks";

interface EditTopicQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
  quiz?: TopicQuiz | null;
  onSuccess?: () => void;
}

type EditableOption = {
  id: string;
  text: string;
};

type EditableQuestion = {
  id: string;
  text: string;
  type: TopicQuizQuestionType;
  explanation: string;
  options: EditableOption[];
  correctOptionId: string;
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createMcqQuestion = (): EditableQuestion => {
  const optionAId = createId();
  const optionBId = createId();

  return {
    id: createId(),
    text: "",
    type: "MCQ",
    explanation: "",
    options: [
      { id: optionAId, text: "Option 1" },
      { id: optionBId, text: "Option 2" },
    ],
    correctOptionId: optionAId,
  };
};

const createTrueFalseQuestion = (): EditableQuestion => ({
  id: createId(),
  text: "",
  type: "TRUE_FALSE",
  explanation: "",
  options: [
    { id: "TRUE", text: "True" },
    { id: "FALSE", text: "False" },
  ],
  correctOptionId: "TRUE",
});

const createQuestionByType = (type: TopicQuizQuestionType): EditableQuestion => {
  switch (type) {
    case "TRUE_FALSE":
      return createTrueFalseQuestion();
    case "MCQ":
    default:
      return createMcqQuestion();
  }
};

const mapQuizToState = (quiz?: TopicQuiz | null) => ({
  title: quiz?.title || "",
  description: quiz?.description || "",
  passingPercentage: String(quiz?.passingPercentage ?? 70),
  questions:
    quiz?.questions?.map((question) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      explanation: question.explanation || "",
      options:
        question.type === "MCQ" || question.type === "TRUE_FALSE"
          ? (question.options || []).map((option) => ({
              id: option.id,
              text: option.text,
            }))
          : [],
      correctOptionId: question.correctOptionId || "",
    })) || [createMcqQuestion()],
});

export function EditTopicQuizModal({
  isOpen,
  onClose,
  topicId,
  topicName,
  quiz,
  onSuccess,
}: EditTopicQuizModalProps) {
  const updateTopicQuizMutation = useUpdateTopicQuiz();
  const [formData, setFormData] = useState(() => mapQuizToState(quiz));

  useEffect(() => {
    if (isOpen) {
      setFormData(mapQuizToState(quiz));
    }
  }, [isOpen, quiz]);

  const updateQuestion = (
    questionId: string,
    updater: (question: EditableQuestion) => EditableQuestion
  ) => {
    setFormData((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.id === questionId ? updater(question) : question
      ),
    }));
  };

  const addQuestion = (type: TopicQuizQuestionType = "MCQ") => {
    setFormData((current) => ({
      ...current,
      questions: [...current.questions, createQuestionByType(type)],
    }));
  };

  const removeQuestion = (questionId: string) => {
    setFormData((current) => ({
      ...current,
      questions:
        current.questions.length > 1
          ? current.questions.filter((question) => question.id !== questionId)
          : [createMcqQuestion()],
    }));
  };

  const handleQuestionTypeChange = (
    questionId: string,
    type: TopicQuizQuestionType
  ) => {
    updateQuestion(questionId, (question) => {
      const nextQuestion = createQuestionByType(type);

      return {
        ...nextQuestion,
        id: question.id,
        text: question.text,
        explanation: question.explanation,
      };
    });
  };

  const handleAddOption = (questionId: string) => {
    updateQuestion(questionId, (question) => {
      const optionId = createId();
      const nextOptions = [
        ...question.options,
        { id: optionId, text: `Option ${question.options.length + 1}` },
      ];

      return {
        ...question,
        options: nextOptions,
        correctOptionId: question.correctOptionId || optionId,
      };
    });
  };

  const handleRemoveOption = (questionId: string, optionId: string) => {
    updateQuestion(questionId, (question) => {
      const nextOptions = question.options.filter((option) => option.id !== optionId);

      return {
        ...question,
        options: nextOptions.length >= 2 ? nextOptions : question.options,
        correctOptionId:
          question.correctOptionId === optionId
            ? nextOptions[0]?.id || question.correctOptionId
            : question.correctOptionId,
      };
    });
  };

  const buildPayload = (): TopicQuiz => ({
    title: formData.title.trim() || undefined,
    description: formData.description.trim() || undefined,
    passingPercentage: Number(formData.passingPercentage) || 70,
    questions: formData.questions.map((question) => ({
      id: question.id,
      text: question.text.trim(),
      type: question.type,
      explanation: question.explanation.trim() || undefined,
      options:
        question.type === "MCQ" || question.type === "TRUE_FALSE"
          ? question.options.map((option) => ({
              id: option.id,
              text: option.text.trim(),
            }))
          : undefined,
      correctOptionId:
        question.type === "MCQ" || question.type === "TRUE_FALSE"
          ? question.correctOptionId
          : undefined,
    })),
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await updateTopicQuizMutation.mutateAsync({
        id: topicId,
        quiz: buildPayload(),
      });
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save topic quiz:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Topic Quiz</DialogTitle>
          <DialogDescription>
            Create a lightweight in-course quiz for {topicName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input
                id="quiz-title"
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Topic checkpoint quiz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quiz-passing">Passing Percentage</Label>
              <Input
                id="quiz-passing"
                type="number"
                min="0"
                max="100"
                value={formData.passingPercentage}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    passingPercentage: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quiz-description">Quiz Description</Label>
            <Textarea
              id="quiz-description"
              rows={3}
              value={formData.description}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Help learners understand what this quiz checks."
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Questions</h3>
                <p className="text-sm text-muted-foreground">
                  Add quick checks that are tied to this topic.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => addQuestion()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </div>

            <div className="space-y-4">
              {formData.questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-base">
                        Question {index + 1}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                          rows={3}
                          value={question.text}
                          onChange={(event) =>
                            updateQuestion(question.id, (current) => ({
                              ...current,
                              text: event.target.value,
                            }))
                          }
                          placeholder="What should the learner answer?"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value) =>
                            handleQuestionTypeChange(
                              question.id,
                              value as TopicQuizQuestionType
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MCQ">Multiple Choice</SelectItem>
                            <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Explanation</Label>
                      <Textarea
                        rows={2}
                        value={question.explanation}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            explanation: event.target.value,
                          }))
                        }
                        placeholder="Optional explanation shown to admins now and available for future learner review."
                      />
                    </div>

                    {(question.type === "MCQ" || question.type === "TRUE_FALSE") && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Options</Label>
                          {question.type === "MCQ" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddOption(question.id)}
                            >
                              <Plus className="mr-2 h-3.5 w-3.5" />
                              Add Option
                            </Button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={option.id}
                              className="grid gap-3 md:grid-cols-[1fr_220px_auto]"
                            >
                              <Input
                                value={option.text}
                                onChange={(event) =>
                                  updateQuestion(question.id, (current) => ({
                                    ...current,
                                    options: current.options.map((currentOption) =>
                                      currentOption.id === option.id
                                        ? {
                                            ...currentOption,
                                            text: event.target.value,
                                          }
                                        : currentOption
                                    ),
                                  }))
                                }
                                placeholder={`Option ${optionIndex + 1}`}
                                disabled={question.type === "TRUE_FALSE"}
                              />
                              <div className="flex items-center gap-2 rounded-md border px-3 text-sm">
                                <input
                                  type="radio"
                                  name={`correct-${question.id}`}
                                  checked={question.correctOptionId === option.id}
                                  onChange={() =>
                                    updateQuestion(question.id, (current) => ({
                                      ...current,
                                      correctOptionId: option.id,
                                    }))
                                  }
                                />
                                <span>Correct answer</span>
                              </div>
                              {question.type === "MCQ" ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleRemoveOption(question.id, option.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <div />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTopicQuizMutation.isPending}>
              {updateTopicQuizMutation.isPending ? "Saving..." : "Save Quiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
