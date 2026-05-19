import React, { useState } from "react";
import { Sparkles, Code, LayoutTemplate, Loader2 } from "lucide-react";
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
import { useTeacherGeneratePlayground } from "@/hooks";
import { AiPlayground } from "@/lib/types/api";

interface PlaygroundGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  topicId?: string;
  contentId?: string;
  onSuccess?: (playground: AiPlayground & { html: string }) => void;
}

export function PlaygroundGeneratorModal({
  isOpen,
  onClose,
  batchId,
  topicId,
  contentId,
  onSuccess,
}: PlaygroundGeneratorModalProps) {
  const [concept, setConcept] = useState("");
  const [instruction, setInstruction] = useState("");
  const [generatedPlayground, setGeneratedPlayground] = useState<(AiPlayground & { html: string }) | null>(null);

  const generateMutation = useTeacherGeneratePlayground();

  const handleGenerate = () => {
    if (!concept.trim()) return;

    generateMutation.mutate(
      {
        concept,
        prompt: instruction,
        batchId,
        topicId,
        contentId,
        refineFromId: generatedPlayground?.id,
        refinementCount: generatedPlayground?.refinements ?? 0,
      },
      {
        onSuccess: (res) => {
          if (res.success && res.data?.playground) {
            setGeneratedPlayground(res.data.playground);
            if (onSuccess) {
              onSuccess(res.data.playground);
            }
          }
        },
      }
    );
  };

  const handleClose = () => {
    setConcept("");
    setInstruction("");
    setGeneratedPlayground(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Interactive Playground Generator
          </DialogTitle>
          <DialogDescription>
            Generate custom HTML/JS/CSS interactive widgets to embed in the AI Tutor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 flex flex-col md:flex-row gap-6">
          {/* Controls */}
          <div className="w-full md:w-1/3 space-y-4 shrink-0">
            <div className="space-y-2">
              <Label>Core Concept</Label>
              <Input
                placeholder="e.g. Recursion, Photosynthesis..."
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                disabled={generateMutation.isPending || !!generatedPlayground}
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
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to let AI decide the best interaction model.
              </p>
            </div>

            <Button
              className="w-full"
              disabled={!concept.trim() || generateMutation.isPending}
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
          </div>

          {/* Preview Area */}
          <div className="flex-1 bg-muted/30 border rounded-xl overflow-hidden flex flex-col">
            <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Live Preview</span>
              </div>
              {generatedPlayground && (
                <span className="text-xs text-muted-foreground">
                  Refinements: {generatedPlayground.refinements}/10
                </span>
              )}
            </div>
            <div className="flex-1 relative min-h-[400px]">
              {generateMutation.isPending ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                  </div>
                  <p className="font-medium animate-pulse">Writing code...</p>
                  <p className="text-sm text-muted-foreground">This usually takes 10-15 seconds.</p>
                </div>
              ) : null}

              {generatedPlayground ? (
                <iframe
                  sandbox="allow-scripts allow-forms"
                  srcDoc={generatedPlayground.html}
                  className="w-full h-full border-none bg-white"
                  title="Playground Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground px-8 text-center">
                  <LayoutTemplate className="h-12 w-12 mb-4 opacity-20" />
                  <p>Enter a concept and click Generate to see the interactive widget preview here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
