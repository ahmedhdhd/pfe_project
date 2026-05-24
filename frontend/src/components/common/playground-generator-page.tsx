"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  Code,
  LayoutTemplate,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetPlaygroundById,
  usePublishPlaygroundToTopic,
  useTeacherGeneratePlayground,
} from "@/hooks";
import type { AiPlayground } from "@/lib/types/api";
import { toast } from "sonner";

function formatPlaygroundError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "Generation timed out (3 min). Try a simpler concept or try again.";
    }
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
    if (error.response?.status === 400) {
      return "OpenRouter API key is missing. Add it in Admin settings under AI.";
    }
    if (error.response?.status === 502) {
      return "OpenRouter returned an error. Check your API key and model settings.";
    }
  }
  return "Could not generate the playground. Please try again.";
}

interface PlaygroundGeneratorPageProps {
  basePath: "admin" | "teacher";
  batchId: string;
  topicId?: string;
  contentId?: string;
  initialConcept?: string;
  initialInstruction?: string;
  existingPlaygroundId?: string | null;
  contextLabel?: string;
}

export function PlaygroundGeneratorPage({
  basePath,
  batchId,
  topicId,
  contentId,
  initialConcept = "",
  initialInstruction = "",
  existingPlaygroundId = null,
  contextLabel,
}: PlaygroundGeneratorPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [concept, setConcept] = useState("");
  const [instruction, setInstruction] = useState("");
  const [contentTitle, setContentTitle] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [generatedPlayground, setGeneratedPlayground] = useState<
    (AiPlayground & { html: string }) | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ignoreExistingSeed, setIgnoreExistingSeed] = useState(false);

  const generateMutation = useTeacherGeneratePlayground();
  const publishMutation = usePublishPlaygroundToTopic();
  const existingQuery = useGetPlaygroundById(
    existingPlaygroundId,
    !!existingPlaygroundId && !generatedPlayground && !ignoreExistingSeed
  );

  useEffect(() => {
    setConcept(initialConcept.trim());
    setInstruction(initialInstruction.trim());
    setContentTitle(initialConcept.trim());
    setContentDescription(initialInstruction.trim());
    setGeneratedPlayground(null);
    setErrorMessage(null);
    setIgnoreExistingSeed(false);
  }, [initialConcept, initialInstruction, existingPlaygroundId]);

  useEffect(() => {
    const loaded = existingQuery.data;
    if (!loaded?.html || generatedPlayground || ignoreExistingSeed) return;

    setGeneratedPlayground({
      id: loaded.id,
      title: loaded.title ?? loaded.concept,
      concept: loaded.concept,
      createdByRole: "TEACHER",
      refinements: loaded.refinements,
      createdAt: loaded.createdAt ?? new Date().toISOString(),
      topicId: loaded.topicId,
      contentId: loaded.contentId,
      html: loaded.html,
    });
    setConcept(loaded.concept);
    setContentTitle(loaded.title ?? loaded.concept);
  }, [existingQuery.data, generatedPlayground, ignoreExistingSeed]);

  const isEditingExisting = useMemo(
    () => Boolean(existingPlaygroundId && !ignoreExistingSeed),
    [existingPlaygroundId, ignoreExistingSeed]
  );

  const handleGenerate = () => {
    if (!concept.trim()) return;

    setErrorMessage(null);
    generateMutation.mutate(
      {
        concept: concept.trim(),
        prompt: instruction.trim(),
        batchId,
        topicId,
        contentId,
        refineFromId: generatedPlayground?.id,
        refinementCount: generatedPlayground?.refinements ?? 0,
      },
      {
        onSuccess: (res) => {
          const playground = res?.data?.playground;
          if (res?.success && playground?.html) {
            setGeneratedPlayground(playground);
            if (!contentTitle.trim()) {
              setContentTitle(playground.title || concept.trim());
            }
            void queryClient.invalidateQueries({ queryKey: ["ai-playgrounds", batchId] });
            return;
          }

          setErrorMessage(res?.message || "Generation failed. Please try again.");
        },
        onError: (error) => {
          setErrorMessage(formatPlaygroundError(error));
        },
      }
    );
  };

  const handlePublish = () => {
    if (!topicId || !generatedPlayground?.id || !contentTitle.trim()) {
      return;
    }

    setErrorMessage(null);
    publishMutation.mutate(
      {
        playgroundId: generatedPlayground.id,
        topicId,
        title: contentTitle.trim(),
        description: contentDescription.trim() || undefined,
      },
      {
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["course-outline", batchId] }),
            queryClient.invalidateQueries({ queryKey: ["course-hierarchy", batchId] }),
            queryClient.invalidateQueries({ queryKey: ["ai-playgrounds", batchId] }),
          ]);

          toast.success(
            isEditingExisting
              ? "AI playground updated in the topic."
              : "AI playground added to the topic."
          );
          router.push(`/${basePath}/courses/${batchId}`);
        },
        onError: (error) => {
          setErrorMessage(formatPlaygroundError(error));
        },
      }
    );
  };

  const handleStartOver = () => {
    setIgnoreExistingSeed(true);
    setGeneratedPlayground(null);
    setErrorMessage(null);
    setConcept(initialConcept.trim());
    setInstruction("");
    setContentTitle(initialConcept.trim());
    setContentDescription("");
  };

  const isLoadingExisting = existingQuery.isLoading && !!existingPlaygroundId && !ignoreExistingSeed;
  const isBusy = generateMutation.isPending || publishMutation.isPending;

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="px-0 text-muted-foreground"
            onClick={() => router.push(`/${basePath}/courses/${batchId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to course
          </Button>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              AI Playground Builder
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {contextLabel
                ? `Build an interactive playground for ${contextLabel}, then publish it as part of the course topic.`
                : "Generate an interactive playground, preview it, and publish it into the course."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Build Playground
            </CardTitle>
            <CardDescription>
              Generate a reusable interactive experience, then publish it as a lesson item inside this topic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="playground-concept">Core concept</Label>
              <Input
                id="playground-concept"
                placeholder="e.g. Recursion, Photosynthesis..."
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playground-instructions">Generation instructions</Label>
              <Textarea
                id="playground-instructions"
                placeholder="Describe the interaction you want students to use."
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={5}
                className="resize-none"
                disabled={isBusy}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playground-title">Course content title</Label>
              <Input
                id="playground-title"
                placeholder="Title shown in the topic"
                value={contentTitle}
                onChange={(event) => setContentTitle(event.target.value)}
                disabled={publishMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playground-description">Course content description</Label>
              <Textarea
                id="playground-description"
                placeholder="Optional description for students"
                value={contentDescription}
                onChange={(event) => setContentDescription(event.target.value)}
                rows={4}
                className="resize-none"
                disabled={publishMutation.isPending}
              />
            </div>

            {errorMessage ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}

            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={!concept.trim() || isBusy || isLoadingExisting}
                onClick={handleGenerate}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {generatedPlayground ? "Refining..." : "Generating..."}
                  </>
                ) : (
                  <>
                    <Code className="mr-2 h-4 w-4" />
                    {generatedPlayground ? "Refine Widget" : "Generate Widget"}
                  </>
                )}
              </Button>

              {generatedPlayground ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isBusy}
                  onClick={handleStartOver}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start New Widget
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={!topicId || !generatedPlayground?.id || !contentTitle.trim() || isBusy}
                onClick={handlePublish}
              >
                {publishMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isEditingExisting ? "Update Topic Playground" : "Add to Topic"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                  Live Preview
                </CardTitle>
                <CardDescription>
                  Review the generated widget before adding it to the topic.
                </CardDescription>
              </div>
              {generatedPlayground ? (
                <span className="text-xs text-muted-foreground">
                  Refinements: {generatedPlayground.refinements}/10
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative min-h-[720px] bg-muted/20">
              {generateMutation.isPending || isLoadingExisting ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                    <Sparkles className="h-6 w-6 animate-pulse text-primary" />
                  </div>
                  <p className="font-medium">
                    {isLoadingExisting ? "Loading saved playground..." : "Writing code..."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This usually takes 15-45 seconds.
                  </p>
                </div>
              ) : null}

              {generatedPlayground?.html ? (
                <iframe
                  sandbox="allow-scripts allow-forms"
                  srcDoc={generatedPlayground.html}
                  className="min-h-[720px] w-full border-0 bg-slate-950"
                  title="Playground Preview"
                />
              ) : (
                <div className="flex min-h-[720px] flex-col items-center justify-center px-8 text-center text-muted-foreground">
                  <LayoutTemplate className="mb-4 h-12 w-12 opacity-20" />
                  <p className="max-w-md">
                    Enter a concept, generate a widget, and it will appear here as a full-page preview instead of a popup.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
