"use client";

import DOMPurify from "dompurify";
import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  FileUp,
  ListChecks,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "@/components/icons";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateAssignmentQuestion,
  useDeleteAssignmentQuestion,
  useGenerateAssignmentWithAi,
  useGetAssignment,
  useGetAssignmentAnalytics,
  useGetAssignmentSubmissions,
  useGradeAssignmentSubmission,
  usePublishAssignmentSubmission,
  useUpdateAssignmentQuestion,
} from "@/hooks";
import type {
  AssignmentSubmission,
  AssignmentQuestionLevel,
  AssignmentQuestion,
  AssignmentQuestionOption,
  AssignmentQuestionType,
} from "@/hooks/api";

const isRichTextEmpty = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim().length === 0;

const getQuestionPreviewText = (value?: string | null) =>
  value
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : "";

const sanitizeHtml = (value?: string | null) =>
  DOMPurify.sanitize(value || "");

const getSubmissionAnswer = (
  question: AssignmentQuestion,
  submission?: AssignmentSubmission | null
) => submission?.answersJson?.[question.id];

type PortalRole = "admin" | "teacher";

const QUESTION_TYPE_META: Record<
  AssignmentQuestionType,
  { label: string; description: string; icon: ElementType }
> = {
  QUIZ: {
    label: "Quiz",
    description: "Multiple-choice question with one correct answer.",
    icon: ListChecks,
  },
  TRUE_FALSE: {
    label: "True / False",
    description: "A binary question with a true or false answer.",
    icon: CheckCircle2,
  },
  SHORT_ANSWER: {
    label: "Short Answer",
    description: "Student writes a short text answer.",
    icon: Save,
  },
  FILE_SUBMISSION: {
    label: "File Submission",
    description: "Student uploads a file as their answer.",
    icon: FileUp,
  },
};

function getOptions(question?: AssignmentQuestion | null): AssignmentQuestionOption[] {
  const raw = question?.optionsJson || question?.options;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  if (question?.type === "TRUE_FALSE") {
    return [
      { id: "true", text: "True" },
      { id: "false", text: "False" },
    ];
  }
  return [
    { id: "a", text: "Option A" },
    { id: "b", text: "Option B" },
  ];
}

function getCorrectAnswer(question?: AssignmentQuestion | null) {
  return (
    question?.correctAnswerJson || {
      optionId: "",
      value: true,
      text: "",
    }
  );
}

export function AssignmentEditorPage({
  role,
  assignmentId,
}: {
  role: PortalRole;
  assignmentId: string;
}) {
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState({
    prompt: "",
    count: 5,
    level: "MEDIUM" as AssignmentQuestionLevel,
  });
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [questionDraft, setQuestionDraft] = useState<{
    title: string;
    prompt: string;
    points: number;
    options: AssignmentQuestionOption[];
    correctAnswer: Record<string, unknown>;
  }>({
    title: "",
    prompt: "",
    points: 1,
    options: [],
    correctAnswer: {},
  });
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [submissionDraft, setSubmissionDraft] = useState<{
    score: string;
    maxScore: string;
    feedback: string;
  }>({
    score: "",
    maxScore: "",
    feedback: "",
  });

  const { data: assignmentResponse, isLoading } = useGetAssignment(assignmentId);
  const { data: submissionsResponse } = useGetAssignmentSubmissions(assignmentId);
  const { data: analyticsResponse } = useGetAssignmentAnalytics(assignmentId);
  const createQuestion = useCreateAssignmentQuestion();
  const generateAssignmentWithAi = useGenerateAssignmentWithAi();
  const updateQuestion = useUpdateAssignmentQuestion();
  const deleteQuestion = useDeleteAssignmentQuestion();
  const gradeSubmission = useGradeAssignmentSubmission();
  const publishSubmission = usePublishAssignmentSubmission();

  const assignment = assignmentResponse?.data;
  const questions = useMemo(
    () => [...(assignment?.questions || [])].sort((a, b) => a.order - b.order),
    [assignment?.questions]
  );
  const selectedQuestion =
    questions.find((question) => question.id === selectedQuestionId) ||
    questions[0] ||
    null;
  const submissions = submissionsResponse?.data || [];
  const analytics = analyticsResponse?.data;
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ||
    submissions[0] ||
    null;

  useEffect(() => {
    if (!selectedQuestion) return;
    setSelectedQuestionId(selectedQuestion.id);
    setQuestionDraft({
      title: selectedQuestion.title || "",
      prompt: selectedQuestion.prompt || "",
      points: selectedQuestion.points || 1,
      options: getOptions(selectedQuestion),
      correctAnswer: getCorrectAnswer(selectedQuestion),
    });
  }, [selectedQuestion]);

  useEffect(() => {
    if (!selectedSubmission) return;

    setSelectedSubmissionId(selectedSubmission.id);
    setSubmissionDraft({
      score:
        typeof selectedSubmission.score === "number"
          ? String(selectedSubmission.score)
          : "",
      maxScore:
        typeof selectedSubmission.maxScore === "number"
          ? String(selectedSubmission.maxScore)
          : "",
      feedback: selectedSubmission.feedback || "",
    });
  }, [selectedSubmission]);

  const handleAddQuestion = async (type: AssignmentQuestionType) => {
    try {
      const result = await createQuestion.mutateAsync({
        assignmentId,
        data: {
          type,
          prompt: `New ${QUESTION_TYPE_META[type].label} question`,
          options:
            type === "QUIZ"
              ? [
                  { id: "a", text: "Option A" },
                  { id: "b", text: "Option B" },
                ]
              : type === "TRUE_FALSE"
              ? [
                  { id: "true", text: "True" },
                  { id: "false", text: "False" },
                ]
              : [],
          correctAnswer:
            type === "TRUE_FALSE"
              ? { value: true }
              : type === "QUIZ"
              ? { optionId: "a" }
              : {},
        },
      });
      setSelectedQuestionId(result.data.id);
      setIsTypeDialogOpen(false);
      toast.success("Question added.");
    } catch {
      toast.error("Unable to add question.");
    }
  };

  const handleGenerateWithAi = async () => {
    if (!aiDraft.prompt.trim()) {
      toast.error("Describe what the assignment should cover.");
      return;
    }

    try {
      const result = await generateAssignmentWithAi.mutateAsync({
        assignmentId,
        prompt: aiDraft.prompt,
        count: aiDraft.count,
        level: aiDraft.level,
      });
      const firstQuestion = result.data.questions[0];
      if (firstQuestion?.id) {
        setSelectedQuestionId(firstQuestion.id);
      }
      setIsAiDialogOpen(false);
      const chunkCount = result.data.ragChunksUsed ?? 0;
      toast.success(
        `Generated ${result.data.questions.length} questions from ${chunkCount} course content ${chunkCount === 1 ? "chunk" : "chunks"}.`
      );
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data
              ?.message
          : undefined;
      toast.error(
        message ||
          "Unable to generate assignment questions. Ensure course lessons are indexed for RAG."
      );
    }
  };

  const handleSaveQuestion = async () => {
    if (!selectedQuestion) return;
    if (isRichTextEmpty(questionDraft.prompt)) {
      toast.error("Question prompt is required.");
      return;
    }

    if (
      (selectedQuestion.type === "QUIZ" ||
        selectedQuestion.type === "TRUE_FALSE") &&
      (questionDraft.options.length < 2 ||
        questionDraft.options.some((option) => isRichTextEmpty(option.text)))
    ) {
      toast.error("Please complete at least two options before saving.");
      return;
    }

    if (
      selectedQuestion.type === "QUIZ" &&
      !String(questionDraft.correctAnswer.optionId || "").trim()
    ) {
      toast.error("Select the correct option before saving.");
      return;
    }

    try {
      await updateQuestion.mutateAsync({
        assignmentId,
        questionId: selectedQuestion.id,
        data: {
          title: questionDraft.title.trim(),
          prompt: questionDraft.prompt.trim(),
          points: questionDraft.points,
          options:
            selectedQuestion.type === "QUIZ" ||
            selectedQuestion.type === "TRUE_FALSE"
              ? questionDraft.options
              : [],
          correctAnswer: questionDraft.correctAnswer,
        },
      });
      toast.success("Question saved.");
    } catch {
      toast.error("Unable to save question.");
    }
  };

  const handleDeleteQuestion = async () => {
    if (!selectedQuestion) return;

    try {
      await deleteQuestion.mutateAsync({
        assignmentId,
        questionId: selectedQuestion.id,
      });
      setSelectedQuestionId("");
      toast.success("Question deleted.");
    } catch {
      toast.error("Unable to delete question.");
    }
  };

  const updateOptionText = (optionId: string, text: string) => {
    setQuestionDraft((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.id === optionId ? { ...option, text } : option
      ),
    }));
  };

  const addOption = () => {
    setQuestionDraft((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        {
          id: `option-${Date.now()}`,
          text: `Option ${prev.options.length + 1}`,
        },
      ],
    }));
  };

  const removeOption = (optionId: string) => {
    setQuestionDraft((prev) => ({
      ...prev,
      options:
        selectedQuestion?.type === "TRUE_FALSE"
          ? prev.options
          : prev.options.filter((option) => option.id !== optionId),
      correctAnswer:
        prev.correctAnswer.optionId === optionId ? {} : prev.correctAnswer,
    }));
  };

  const handleSaveSubmissionGrade = async () => {
    if (!selectedSubmission) return;

    try {
      await gradeSubmission.mutateAsync({
        assignmentId,
        submissionId: selectedSubmission.id,
        data: {
          score:
            submissionDraft.score.trim() === ""
              ? undefined
              : Number(submissionDraft.score),
          maxScore:
            submissionDraft.maxScore.trim() === ""
              ? undefined
              : Number(submissionDraft.maxScore),
          feedback: submissionDraft.feedback,
        },
      });
      toast.success("Submission graded.");
    } catch {
      toast.error("Unable to save the grade.");
    }
  };

  const handlePublishSubmission = async () => {
    if (!selectedSubmission) return;

    try {
      await publishSubmission.mutateAsync({
        assignmentId,
        submissionId: selectedSubmission.id,
        data: {
          score:
            submissionDraft.score.trim() === ""
              ? undefined
              : Number(submissionDraft.score),
          maxScore:
            submissionDraft.maxScore.trim() === ""
              ? undefined
              : Number(submissionDraft.maxScore),
          feedback: submissionDraft.feedback,
        },
      });
      toast.success("Result published and email sent.");
    } catch {
      toast.error("Unable to publish the result.");
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading assignment...</div>;
  }

  if (!assignment) {
    return <div className="p-8">Assignment not found.</div>;
  }

  const breadcrumbs =
    role === "admin"
      ? [
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Assignments", href: "/admin/assignments" },
          { label: assignment.title },
        ]
      : [
          { label: "Teacher", href: "/teacher/dashboard" },
          { label: "Assignments", href: "/teacher/assignments" },
          { label: assignment.title },
        ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title}
        description={`${assignment.batch?.name || "Course"}${
          assignment.topic?.name ? ` / ${assignment.topic.name}` : ""
        }`}
        breadcrumbs={breadcrumbs}
        actions={
          <Button asChild variant="outline">
            <Link href={`/${role}/assignments`}>Back to assignments</Link>
          </Button>
        }
      />

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card className="h-fit">
              <CardHeader className="space-y-2">
                <Button onClick={() => setIsAiDialogOpen(true)} variant="secondary">
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Generate
                </Button>
                <Button onClick={() => setIsTypeDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {questions.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No questions yet.
                  </p>
                ) : (
                  questions.map((question, index) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => setSelectedQuestionId(question.id)}
                      className={`w-full rounded-xl border p-3 text-left transition hover:bg-muted ${
                        selectedQuestion?.id === question.id
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          Question {index + 1}
                        </span>
                        <Badge variant="outline">
                          {QUESTION_TYPE_META[question.type].label}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {getQuestionPreviewText(question.prompt)}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>
                    {selectedQuestion
                      ? QUESTION_TYPE_META[selectedQuestion.type].label
                      : "Question Editor"}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Save each question independently.
                  </p>
                </div>
                {selectedQuestion ? (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDeleteQuestion}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                    <Button onClick={handleSaveQuestion}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Question
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent>
                {!selectedQuestion ? (
                  <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                    Select or add a question to start editing.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                      <div className="space-y-2">
                        <Label>Question title</Label>
                        <Input
                          value={questionDraft.title}
                          onChange={(e) =>
                            setQuestionDraft((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Optional internal title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          min={0}
                          value={questionDraft.points}
                          onChange={(e) =>
                            setQuestionDraft((prev) => ({
                              ...prev,
                              points: Number(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Prompt *</Label>
                      <RichTextEditor
                        content={questionDraft.prompt}
                        onChange={(value) =>
                          setQuestionDraft((prev) => ({
                            ...prev,
                            prompt: value,
                          }))
                        }
                        placeholder="Write the question students will see."
                        contentMinHeightClassName="min-h-[180px]"
                        contentMaxHeightClassName="max-h-[320px]"
                      />
                    </div>

                    {selectedQuestion.type === "QUIZ" ||
                    selectedQuestion.type === "TRUE_FALSE" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Options</Label>
                          {selectedQuestion.type === "QUIZ" ? (
                            <Button type="button" size="sm" variant="outline" onClick={addOption}>
                              Add option
                            </Button>
                          ) : null}
                        </div>
                        <RadioGroup
                          value={
                            selectedQuestion.type === "TRUE_FALSE"
                              ? String(questionDraft.correctAnswer.value ?? true)
                              : String(questionDraft.correctAnswer.optionId || "")
                          }
                          onValueChange={(value) =>
                            setQuestionDraft((prev) => ({
                              ...prev,
                              correctAnswer:
                                selectedQuestion.type === "TRUE_FALSE"
                                  ? { value: value === "true" }
                                  : { optionId: value },
                            }))
                          }
                        >
                          {questionDraft.options.map((option) => (
                            <div key={option.id} className="flex items-start gap-3">
                              <RadioGroupItem value={option.id} id={option.id} className="mt-3" />
                              <div className="flex-1">
                                <RichTextEditor
                                  content={option.text}
                                  onChange={(value) =>
                                    updateOptionText(option.id, value)
                                  }
                                  placeholder={`Option ${option.id}`}
                                  contentMinHeightClassName="min-h-[96px]"
                                  contentMaxHeightClassName="max-h-[180px]"
                                  className="prose-sm"
                                />
                              </div>
                              {selectedQuestion.type === "QUIZ" ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => removeOption(option.id)}
                                  className="mt-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ) : null}

                    {selectedQuestion.type === "SHORT_ANSWER" ? (
                      <div className="space-y-2">
                        <Label>Suggested answer</Label>
                        <RichTextEditor
                          content={String(questionDraft.correctAnswer.text || "")}
                          onChange={(value) =>
                            setQuestionDraft((prev) => ({
                              ...prev,
                              correctAnswer: { text: value },
                            }))
                          }
                          placeholder="Optional answer key for manual grading."
                          contentMinHeightClassName="min-h-[140px]"
                          contentMaxHeightClassName="max-h-[220px]"
                        />
                      </div>
                    ) : null}

                    {selectedQuestion.type === "FILE_SUBMISSION" ? (
                      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
                        Students will upload a file for this question. Grading is
                        manual in the submissions tab.
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="submissions">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_420px]">
            <Card>
              <CardHeader>
                <CardTitle>Student Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center">
                            No submissions yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        submissions.map((submission) => (
                          <TableRow
                            key={submission.id}
                            className={
                              selectedSubmission?.id === submission.id
                                ? "cursor-pointer bg-primary/5"
                                : "cursor-pointer"
                            }
                            onClick={() => setSelectedSubmissionId(submission.id)}
                          >
                            <TableCell>
                              <div className="font-medium">
                                {submission.student?.username || "Student"}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {submission.student?.email}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {submission.status.toLowerCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {submission.score ?? "-"} / {submission.maxScore ?? "-"}
                            </TableCell>
                            <TableCell>
                              {submission.submittedAt
                                ? new Date(submission.submittedAt).toLocaleString()
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardHeader>
                <CardTitle>
                  {selectedSubmission
                    ? selectedSubmission.student?.username || "Submission"
                    : "Submission details"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review answers, save the score, then publish the result to email the student.
                </p>
              </CardHeader>
              <CardContent>
                {!selectedSubmission ? (
                  <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Select a submission to review it.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {selectedSubmission.status.toLowerCase()}
                      </Badge>
                      {selectedSubmission.gradedAt ? (
                        <Badge variant="secondary">
                          Graded {new Date(selectedSubmission.gradedAt).toLocaleString()}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Score</Label>
                        <Input
                          type="number"
                          min={0}
                          value={submissionDraft.score}
                          onChange={(e) =>
                            setSubmissionDraft((prev) => ({
                              ...prev,
                              score: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max score</Label>
                        <Input
                          type="number"
                          min={0}
                          value={submissionDraft.maxScore}
                          onChange={(e) =>
                            setSubmissionDraft((prev) => ({
                              ...prev,
                              maxScore: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Feedback</Label>
                      <Textarea
                        rows={5}
                        value={submissionDraft.feedback}
                        onChange={(e) =>
                          setSubmissionDraft((prev) => ({
                            ...prev,
                            feedback: e.target.value,
                          }))
                        }
                        placeholder="Write feedback for the student..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSaveSubmissionGrade}
                        disabled={gradeSubmission.isPending}
                      >
                        {gradeSubmission.isPending ? "Saving..." : "Save Grade"}
                      </Button>
                      <Button
                        onClick={handlePublishSubmission}
                        disabled={publishSubmission.isPending}
                      >
                        {publishSubmission.isPending
                          ? "Publishing..."
                          : "Publish Result"}
                      </Button>
                    </div>

                    <div className="space-y-3 border-t pt-5">
                      <p className="text-sm font-medium">Student answers</p>
                      {questions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No questions were found for this assignment.
                        </p>
                      ) : (
                        questions.map((question, index) => {
                          const answer = getSubmissionAnswer(
                            question,
                            selectedSubmission
                          );
                          const options = getOptions(question);
                          const selectedOption = options.find((option) => {
                            if (question.type === "TRUE_FALSE") {
                              return String(answer) === option.id;
                            }
                            return String(answer) === option.id;
                          });

                          return (
                            <div
                              key={question.id}
                              className="rounded-2xl border bg-muted/20 p-4"
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div className="font-medium">
                                  Question {index + 1}
                                </div>
                                <Badge variant="outline">
                                  {QUESTION_TYPE_META[question.type].label}
                                </Badge>
                              </div>
                              <div
                                className="prose prose-sm mb-3 max-w-none text-sm dark:prose-invert [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeHtml(question.prompt),
                                }}
                              />

                              {question.type === "QUIZ" ||
                              question.type === "TRUE_FALSE" ? (
                                selectedOption ? (
                                  <div
                                    className="prose prose-sm max-w-none rounded-xl border bg-background p-3 dark:prose-invert [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeHtml(selectedOption.text),
                                    }}
                                  />
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No answer selected.
                                  </p>
                                )
                              ) : null}

                              {question.type === "SHORT_ANSWER" ? (
                                <div className="rounded-xl border bg-background p-3 text-sm whitespace-pre-wrap">
                                  {String(answer || "No answer provided.")}
                                </div>
                              ) : null}

                              {question.type === "FILE_SUBMISSION" ? (
                                typeof answer === "string" && answer.trim() ? (
                                  <Button asChild variant="outline" size="sm">
                                    <a
                                      href={answer}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open submitted file
                                    </a>
                                  </Button>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    No file submitted.
                                  </p>
                                )
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-5">
            {[
              ["Questions", analytics?.questions ?? 0],
              ["Submissions", analytics?.submissions ?? 0],
              ["Pending grading", analytics?.pending ?? 0],
              ["Graded", analytics?.graded ?? 0],
              ["Published", analytics?.published ?? 0],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div className="text-3xl font-bold">{value}</div>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Choose the type of question to add to this assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(QUESTION_TYPE_META) as AssignmentQuestionType[]).map(
              (type) => {
                const Icon = QUESTION_TYPE_META[type].icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleAddQuestion(type)}
                    className="rounded-2xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"
                  >
                    <Icon className="mb-3 h-5 w-5 text-primary" />
                    <div className="font-semibold">
                      {QUESTION_TYPE_META[type].label}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {QUESTION_TYPE_META[type].description}
                    </p>
                  </button>
                );
              }
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Assignment with AI</DialogTitle>
            <DialogDescription>
              Questions are generated from indexed course lesson content (RAG). Link this
              assignment to a topic for tighter scope, describe what to assess, and ensure
              lessons have extracted text and embeddings before generating.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea
                rows={6}
                value={aiDraft.prompt}
                onChange={(e) =>
                  setAiDraft((prev) => ({ ...prev, prompt: e.target.value }))
                }
                placeholder="Example: Create beginner questions about React hooks: useState, useEffect, dependency arrays, and common mistakes."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Question level</Label>
                <Select
                  value={aiDraft.level}
                  onValueChange={(value) =>
                    setAiDraft((prev) => ({
                      ...prev,
                      level: value as AssignmentQuestionLevel,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Number of questions</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={aiDraft.count}
                  onChange={(e) =>
                    setAiDraft((prev) => ({
                      ...prev,
                      count: Math.min(Math.max(Number(e.target.value) || 1, 1), 12),
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAiDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={generateAssignmentWithAi.isPending}
              >
                {generateAssignmentWithAi.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
