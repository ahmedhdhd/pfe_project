"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, User, Lightbulb, FileText } from "lucide-react";
import type { SolutionAnswer } from "./types";

interface QuestionSolutionCardProps {
  answer: SolutionAnswer;
  index: number;
}

export function QuestionSolutionCard({
  answer,
  index,
}: QuestionSolutionCardProps) {
  const question = answer.question;
  const isCorrect = answer.isCorrect;
  const userSelectedOption = answer.selectedOption;
  const correctOption = question.options?.find(
    (opt) => opt.isCorrect === true
  );

  return (
    <div className="p-6 border-2 rounded-xl space-y-6 bg-card">
      {/* Question Header */}
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {question.displayOrder || index + 1}
            </div>
            <span className="font-bold text-lg">
              Question {question.displayOrder || index + 1}
            </span>
            {answer.isSkipped ? (
              <Badge
                variant="outline"
                className="bg-amber-50 dark:bg-amber-950/20 border-amber-300"
              >
                Skipped
              </Badge>
            ) : isCorrect ? (
              <Badge className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Correct
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Incorrect
              </Badge>
            )}
            {question.marks && (
              <Badge variant="outline">
                {question.marks} marks
                {answer.marksAwarded !== undefined &&
                  answer.marksAwarded !== question.marks && (
                    <span className="ml-1">
                      ({answer.marksAwarded > 0 ? "+" : ""}
                      {answer.marksAwarded.toFixed(1)})
                    </span>
                  )}
              </Badge>
            )}
            {answer.isMarkedForReview && (
              <Badge
                variant="outline"
                className="bg-blue-50 dark:bg-blue-950/20"
              >
                Marked for Review
              </Badge>
            )}
          </div>
          <div className="text-base space-y-2">
            <p className="font-semibold">{question.text}</p>
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="Question"
                className="max-w-full h-auto rounded-lg border"
              />
            )}
          </div>
        </div>
      </div>

      {/* All Options - Neutral Display */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            All Options:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {question.options.map(
              (
                option: SolutionAnswer["question"]["options"][0],
                optIndex: number
              ) => (
                <div
                  key={option.id}
                  className="p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {String.fromCharCode(65 + optIndex)}.
                    </span>
                    <span className="text-sm">{option.text}</span>
                  </div>
                  {option.imageUrl && (
                    <img
                      src={option.imageUrl}
                      alt="Option"
                      className="mt-2 max-w-full h-auto rounded"
                    />
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      <Separator className="my-6" />

      {/* Your Answer Section */}
      <YourAnswerSection
        answer={answer}
        isCorrect={isCorrect}
        userSelectedOption={userSelectedOption}
        question={question}
      />

      <Separator className="my-6" />

      {/* Correct Answer Section */}
      <CorrectAnswerSection correctOption={correctOption} />

      {/* Explanation Section */}
      {question.explanation && (
        <>
          <Separator className="my-6" />
          <ExplanationSection question={question} />
        </>
      )}

      {/* Additional Info */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <span>Time spent: {answer.timeSpentSeconds}s</span>
        {question.difficulty && (
          <Badge variant="outline" className="text-xs">
            {question.difficulty}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface YourAnswerSectionProps {
  answer: SolutionAnswer;
  isCorrect: boolean;
  userSelectedOption: SolutionAnswer["selectedOption"];
  question: SolutionAnswer["question"];
}

function YourAnswerSection({
  answer,
  isCorrect,
  userSelectedOption,
  question,
}: YourAnswerSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <User className="h-5 w-5 text-blue-600" />
        <h3 className="font-bold text-base">Your Answer</h3>
      </div>

      {answer.isSkipped ? (
        <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Question was skipped
            </p>
          </div>
        </div>
      ) : answer.selectedOptionId && userSelectedOption ? (
        <div
          className={`p-4 rounded-lg border-2 ${
            isCorrect
              ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800"
              : "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={`font-semibold ${
                isCorrect
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {userSelectedOption.text}
            </span>
          </div>
          {userSelectedOption.imageUrl && (
            <img
              src={userSelectedOption.imageUrl}
              alt="Your selected option"
              className="mt-2 max-w-full h-auto rounded border"
            />
          )}
          {answer.marksAwarded !== undefined && (
            <div className="mt-2 text-xs text-muted-foreground">
              Marks: {answer.marksAwarded > 0 ? "+" : ""}
              {answer.marksAwarded.toFixed(1)} / {question.marks}
            </div>
          )}
        </div>
      ) : answer.textAnswer ? (
        <div
          className={`p-4 rounded-lg border-2 ${
            isCorrect
              ? "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800"
              : "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <span
              className={`font-semibold ${
                isCorrect
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              Your Answer:
            </span>
          </div>
          <p className="text-sm">{answer.textAnswer}</p>
          {answer.marksAwarded !== undefined && (
            <div className="mt-2 text-xs text-muted-foreground">
              Marks: {answer.marksAwarded > 0 ? "+" : ""}
              {answer.marksAwarded.toFixed(1)} / {question.marks}
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            No answer submitted
          </p>
        </div>
      )}
    </div>
  );
}

interface CorrectAnswerSectionProps {
  correctOption?: SolutionAnswer["question"]["options"][0] | undefined;
}

function CorrectAnswerSection({ correctOption }: CorrectAnswerSectionProps) {
  if (!correctOption) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-green-600" />
        <h3 className="font-bold text-base text-green-700 dark:text-green-400">
          Correct Answer
        </h3>
      </div>

      <div className="p-4 rounded-lg border-2 bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-700 dark:text-green-400">
            {correctOption.text}
          </span>
        </div>
        {correctOption.imageUrl && (
          <img
            src={correctOption.imageUrl}
            alt="Correct answer"
            className="mt-2 max-w-full h-auto rounded border"
          />
        )}
      </div>
    </div>
  );
}

interface ExplanationSectionProps {
  question: SolutionAnswer["question"];
}

function ExplanationSection({ question }: ExplanationSectionProps) {
  if (!question.explanation) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-purple-600" />
        <h3 className="font-bold text-base">Explanation</h3>
      </div>
      <div className="p-4 rounded-lg border bg-purple-50/50 dark:bg-purple-950/10 border-purple-200 dark:border-purple-800">
        <p className="text-sm">{question.explanation}</p>
        {question.explanationImageUrl && (
          <img
            src={question.explanationImageUrl}
            alt="Explanation"
            className="mt-3 max-w-full h-auto rounded-lg border"
          />
        )}
      </div>
    </div>
  );
}

