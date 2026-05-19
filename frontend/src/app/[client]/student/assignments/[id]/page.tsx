"use client";

import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/common/file-upload";
import { useGetStudentAssignment, useSubmitAssignment } from "@/hooks";
import type { AssignmentQuestion } from "@/hooks/api";

function getOptions(question: AssignmentQuestion) {
  const options = question.options || question.optionsJson || [];
  if (options.length > 0) {
    return options;
  }

  if (question.type === "TRUE_FALSE") {
    return [
      { id: "true", text: "True" },
      { id: "false", text: "False" },
    ];
  }

  return [];
}

export default function StudentAssignmentPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;
  const { data: assignmentResponse, isLoading } =
    useGetStudentAssignment(assignmentId);
  const submitAssignment = useSubmitAssignment();
  const assignment = assignmentResponse?.data;

  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const isSubmitted = Boolean(assignment?.mySubmission?.submittedAt);
  const isResultPublished = assignment?.mySubmission?.status === "RETURNED";
  const questions = useMemo(
    () => [...(assignment?.questions || [])].sort((a, b) => a.order - b.order),
    [assignment?.questions]
  );

  useEffect(() => {
    if (
      assignment?.mySubmission?.answersJson &&
      Object.keys(answers).length === 0
    ) {
      setAnswers(assignment.mySubmission.answersJson);
    }
  }, [answers, assignment?.mySubmission?.answersJson]);

  const updateAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!assignment) return;

    const unanswered = questions.filter(
      (question) =>
        answers[question.id] === undefined ||
        answers[question.id] === "" ||
        answers[question.id] === null
    );

    if (unanswered.length > 0) {
      toast.error("Please answer every question before submitting.");
      return;
    }

    try {
      await submitAssignment.mutateAsync({ id: assignment.id, answers });
      toast.success("Assignment submitted.");
    } catch {
      toast.error("Unable to submit assignment.");
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading assignment...</div>;
  }

  if (!assignment) {
    return <div className="p-8">Assignment not found.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Badge variant={isSubmitted ? "default" : "outline"}>
            {isSubmitted ? "submitted" : assignment.status.toLowerCase()}
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{assignment.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {assignment.batch?.name}
              {assignment.topic?.name ? ` / ${assignment.topic.name}` : ""}
            </p>
          </CardHeader>
          {assignment.description ? (
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {assignment.description}
              </p>
            </CardContent>
          ) : null}
        </Card>

        {isResultPublished ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Published Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">
                  Score: {assignment.mySubmission?.score ?? "-"} /{" "}
                  {assignment.mySubmission?.maxScore ?? "-"}
                </Badge>
                {assignment.mySubmission?.gradedAt ? (
                  <Badge variant="outline">
                    Published{" "}
                    {new Date(assignment.mySubmission.gradedAt).toLocaleString()}
                  </Badge>
                ) : null}
              </div>
              {assignment.mySubmission?.feedback ? (
                <div className="rounded-2xl border bg-muted/20 p-4 text-sm whitespace-pre-wrap">
                  {assignment.mySubmission.feedback}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No feedback was added for this submission.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <Badge variant="outline">{question.points} pts</Badge>
              </div>
              <div
                className="prose prose-sm max-w-none text-sm leading-6 text-muted-foreground dark:prose-invert [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(question.prompt || ""),
                }}
              />
            </CardHeader>
            <CardContent>
              {question.type === "QUIZ" ? (
                <RadioGroup
                  value={String(answers[question.id] || "")}
                  onValueChange={(value) => updateAnswer(question.id, value)}
                  disabled={isSubmitted}
                >
                  {getOptions(question).map((option) => (
                    <div key={option.id} className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} className="mt-1" />
                      <Label htmlFor={`${question.id}-${option.id}`} className="flex-1 cursor-pointer">
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(option.text || ""),
                          }}
                        />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : null}

              {question.type === "TRUE_FALSE" ? (
                <RadioGroup
                  value={String(answers[question.id] ?? "")}
                  onValueChange={(value) => updateAnswer(question.id, value === "true")}
                  disabled={isSubmitted}
                >
                  {getOptions(question).map((option) => (
                    <div key={option.id} className="flex items-start gap-3 rounded-xl border p-3">
                      <RadioGroupItem
                        value={option.id}
                        id={`${question.id}-${option.id}`}
                        className="mt-1"
                      />
                      <Label htmlFor={`${question.id}-${option.id}`} className="flex-1 cursor-pointer">
                        <div
                          className="prose prose-sm max-w-none dark:prose-invert [&_ol]:ml-6 [&_ol]:list-decimal [&_ul]:ml-6 [&_ul]:list-disc"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(option.text || ""),
                          }}
                        />
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : null}

              {question.type === "SHORT_ANSWER" ? (
                <Textarea
                  value={String(answers[question.id] || "")}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  disabled={isSubmitted}
                  rows={5}
                  placeholder="Write your answer..."
                />
              ) : null}

              {question.type === "FILE_SUBMISSION" ? (
                <div className="space-y-3">
                  <FileUpload
                    maxSize={50}
                    onUploadComplete={(file) => updateAnswer(question.id, file.url)}
                  />
                  {answers[question.id] ? (
                    <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-3 text-sm">
                      <FileUp className="h-4 w-4 text-primary" />
                      File uploaded
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Upload your file before submitting.
                    </p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}

        <div className="sticky bottom-4 flex justify-end">
          <Button
            size="lg"
            disabled={isSubmitted || submitAssignment.isPending}
            onClick={handleSubmit}
          >
            {isSubmitted ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submitted
              </>
            ) : submitAssignment.isPending ? (
              "Submitting..."
            ) : (
              "Submit Assignment"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
