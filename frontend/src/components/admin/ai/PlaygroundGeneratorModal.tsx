import React, { useEffect, useState } from "react";
import axios from "axios";
import { Sparkles, Code, LayoutTemplate, Loader2, RotateCcw } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetPlaygroundById, useTeacherGeneratePlayground } from "@/hooks";
import { AiPlayground } from "@/lib/types/api";
import { useQueryClient } from "@tanstack/react-query";

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
      return "OpenRouter API key is missing. Add it in Admin → Settings → AI.";
    }
    if (error.response?.status === 502) {
      return "OpenRouter returned an error. Check your API key and model settings.";
    }
  }
  return "Could not generate the playground. Please try again.";
}

interface PlaygroundGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  topicId?: string;
  contentId?: string;
  initialConcept?: string;
  initialInstruction?: string;
  existingPlaygroundId?: string | null;
  contextLabel?: string;
  onSuccess?: (playground: AiPlayground & { html: string }) => void;
}

export function PlaygroundGeneratorModal({
  isOpen,
  onClose,
  batchId,
  topicId,
  contentId,
  initialConcept = "",
  initialInstruction = "",
  existingPlaygroundId = null,
  contextLabel,
  onSuccess,
}: PlaygroundGeneratorModalProps) {
  const queryClient = useQueryClient();
  const [concept, setConcept] = useState("");
  const [instruction, setInstruction] = useState("");
  const [generatedPlayground, setGeneratedPlayground] = useState<
    (AiPlayground & { html: string }) | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateMutation = useTeacherGeneratePlayground();
  const existingQuery = useGetPlaygroundById(
    existingPlaygroundId,
    isOpen && !!existingPlaygroundId && !generatedPlayground
  );

  useEffect(() => {
    if (!isOpen) return;
    setConcept(initialConcept.trim());
    setInstruction(initialInstruction.trim());
    setErrorMessage(null);
    if (!existingPlaygroundId) {
      setGeneratedPlayground(null);
    }
  }, [isOpen, initialConcept, initialInstruction, existingPlaygroundId]);

  useEffect(() => {
    const loaded = existingQuery.data;
    if (!loaded?.html || generatedPlayground) return;
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
  }, [existingQuery.data, generatedPlayground]);

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
            void queryClient.invalidateQueries({ queryKey: ["ai-playgrounds", batchId] });
            onSuccess?.(playground);
            return;
          }
          setErrorMessage(res?.message || "Generation failed. Please try again.");
        },
        onError: (err) => {
          setErrorMessage(formatPlaygroundError(err));
        },
      }
    );
  };

  const handleStartOver = () => {
    setGeneratedPlayground(null);
    setErrorMessage(null);
    setConcept(initialConcept.trim());
    setInstruction("");
  };

  const handleClose = () => {
    setConcept("");
    setInstruction("");
    setGeneratedPlayground(null);
    setErrorMessage(null);
    onClose();
  };

  const isLoadingExisting = existingQuery.isLoading && !!existingPlaygroundId;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Interactive Playground Generator
          </DialogTitle>
          <DialogDescription>
            {contextLabel
              ? `Create an interactive widget for ${contextLabel}. Students will see it in the AI tutor for this lesson.`
              : "Generate custom HTML/JS/CSS interactive widgets for the AI tutor."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 space-y-4 shrink-0">
            <div className="space-y-2">
              <Label>Core Concept</Label>
              <Input
                placeholder="e.g. Recursion, Photosynthesis..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                disabled={generateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                The main topic this widget will teach.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Custom Instructions (Optional)</Label>
              <Textarea
                placeholder="Make it a drag-and-drop game..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={4}
                className="resize-none"
                disabled={generateMutation.isPending}
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
                {errorMessage}
              </p>
            ) : null}

            <Button
              className="w-full"
              disabled={!concept.trim() || generateMutation.isPending || isLoadingExisting}
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
                disabled={generateMutation.isPending}
                onClick={handleStartOver}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Start New Widget
              </Button>
            ) : null}
          </div>

          <div className="flex-1 bg-muted/30 border rounded-xl overflow-hidden flex flex-col min-h-[420px]">
            <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live Preview</span>
              </div>
              {generatedPlayground ? (
                <span className="text-xs text-muted-foreground">
                  Refinements: {generatedPlayground.refinements}/10
                </span>
              ) : null}
            </div>
            <div className="flex-1 relative min-h-[400px]">
              {generateMutation.isPending || isLoadingExisting ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <p className="font-medium animate-pulse">
                    {isLoadingExisting ? "Loading saved widget..." : "Writing code..."}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This usually takes 15–45 seconds.
                  </p>
                </div>
              ) : null}

              {generatedPlayground?.html ? (
                <iframe
                  sandbox="allow-scripts allow-forms"
                  srcDoc={generatedPlayground.html}
                  className="w-full h-full min-h-[400px] border-none bg-[#0A0E1A]"
                  title="Playground Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground px-8 text-center">
                  <LayoutTemplate className="h-12 w-12 mb-4 opacity-20" />
                  <p>
                    Enter a concept and click Generate to preview the interactive widget here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
