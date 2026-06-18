import React, { useEffect, useRef, useState } from "react";
import { Send, X, Bot, Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AiMessageBubble } from "./AiMessageBubble";
import { useAiChat } from "@/hooks";
import { AiChatMessage } from "@/lib/types/api";
import axios from "axios";

function formatAiChatError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "The AI request timed out. Try a shorter question or try again in a moment.";
    }
    const msg = error.response?.data?.message;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
    if (error.response?.status === 502) {
      return "The AI provider returned an error. Check Admin -> AI (OpenRouter key & chat provider).";
    }
  }
  return "Sorry, something went wrong. Please try again.";
}

interface AiSidebarProps {
  batchId: string;
  chapterId: string;
  topicId: string;
  contentId: string;
  contentName: string;
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

export function AiSidebar({
  batchId,
  chapterId,
  topicId,
  contentId,
  isOpen,
  onClose,
  width = 380,
  onWidthChange,
}: AiSidebarProps) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResize = (_e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", stopResize);
  };

  const handleResize = (e: MouseEvent) => {
    if (!isResizing.current || !onWidthChange) return;

    const newWidth = document.body.clientWidth - e.clientX;
    if (newWidth >= 300 && newWidth <= 600) {
      onWidthChange(newWidth);
    }
  };

  const stopResize = () => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
  };

  const aiChatMutation = useAiChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, aiChatMutation.isPending]);

  const handleSend = () => {
    if (!input.trim() || aiChatMutation.isPending) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      type: "text",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const history = messages.map((message) => ({
      role: message.role,
      content: message.content || (message.playground ? `[Generated playground: ${message.playground.concept}]` : ""),
    }));

    aiChatMutation.mutate(
      {
        message: userMsg.content || "",
        history,
        context: {
          batchId,
          chapterId,
          topicId,
          contentId,
        },
      },
      {
        onSuccess: (res) => {
          if (res.success && res.data?.reply) {
            setMessages((prev) => [
              ...prev,
              {
                id: `ai-${Date.now()}`,
                role: "assistant",
                type: res.data.reply.type,
                content: res.data.reply.text,
                playground: res.data.reply.playground,
                timestamp: new Date(),
              },
            ]);
            return;
          }

          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              type: "text",
              content: `Error: ${res.message || "AI request failed."}`,
              timestamp: new Date(),
            },
          ]);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              type: "text",
              content: `Error: ${formatAiChatError(err)}`,
              timestamp: new Date(),
            },
          ]);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="relative flex h-full w-full flex-col bg-background">
      {onWidthChange && (
        <div
          className="absolute left-0 top-0 bottom-0 z-10 hidden w-1 cursor-col-resize transition-colors hover:bg-primary/50 active:bg-primary lg:block"
          onMouseDown={startResize}
        />
      )}

      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Tutor</h3>
            <p className="text-xs text-muted-foreground">Course-aware assistant</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="ai-sidebar-scroll flex-1 min-h-0 p-4">
        <div className="flex flex-col gap-2 pb-4">
          {messages.map((message) => (
            <AiMessageBubble key={message.id} message={message} />
          ))}

          {aiChatMutation.isPending && (
            <div className="flex w-full flex-row gap-3 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-muted text-primary shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="flex max-w-[85%] flex-col gap-2 rounded-2xl rounded-tl-sm border bg-card px-4 py-3 text-sm shadow-sm">
                <div className="flex h-5 items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t bg-background p-4">
        <div className="relative flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this lesson..."
            className="min-h-[44px] max-h-32 resize-none rounded-2xl border-transparent bg-muted/50 py-3 pr-12 focus-visible:border-primary/30 focus-visible:ring-1 focus-visible:ring-primary/30"
            rows={1}
          />
          <Button
            size="icon"
            className="absolute right-1.5 bottom-1.5 h-8 w-8 rounded-full"
            disabled={!input.trim() || aiChatMutation.isPending}
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          AI can make mistakes. Verify important information.
        </p>
      </div>

      <style jsx global>{`
        .ai-sidebar-scroll
          [data-slot="scroll-area-scrollbar"][data-orientation="vertical"] {
          width: 12px;
          padding: 2px;
          opacity: 1;
        }

        .ai-sidebar-scroll [data-slot="scroll-area-thumb"] {
          background-color: hsl(var(--primary) / 0.28);
        }

        .ai-sidebar-scroll
          [data-slot="scroll-area-scrollbar"]:hover
          [data-slot="scroll-area-thumb"] {
          background-color: hsl(var(--primary) / 0.45);
        }
      `}</style>
    </div>
  );
}
