import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AiChatMessage } from "@/lib/types/api";
import { cn } from "@/lib/utils";
import { User, Sparkles } from "lucide-react";

interface AiMessageBubbleProps {
  message: AiChatMessage;
}

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3 py-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted border-primary/20 text-primary"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border rounded-tl-sm"
        )}
      >
        {message.type === "text" && message.content && (
          <div
            className={cn(
              "prose prose-sm max-w-none break-words",
              isUser ? "prose-invert" : "dark:prose-invert"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.type === "playground" && message.playground && (
          <PlaygroundEmbed playground={message.playground} />
        )}

        {message.type === "mixed" && message.content && message.playground && (
          <div className="space-y-4">
            <div
              className={cn(
                "prose prose-sm max-w-none break-words",
                isUser ? "prose-invert" : "dark:prose-invert"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Visual separator */}
            <div className="flex items-center gap-2 py-1">
              <div className="h-px flex-1 bg-border/40" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Interactive Widget
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            <PlaygroundEmbed playground={message.playground} />
          </div>
        )}
      </div>
    </div>
  );
}

function PlaygroundEmbed({ playground }: { playground: NonNullable<AiChatMessage["playground"]> }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border/30 bg-[#0A0E1A] shadow-md w-full">
      <div className="px-3 py-2 bg-[#1E2640] border-b border-border/10 flex items-center justify-between">
        <span className="text-xs text-slate-300 font-medium truncate flex-1" title={playground.concept}>
          {playground.concept}
        </span>
        <div className="flex gap-1.5 shrink-0 ml-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-slate-600/50" />
        </div>
      </div>
      <iframe
        sandbox="allow-scripts allow-forms"
        srcDoc={playground.html}
        style={{ width: "100%", height: "480px", border: "none" }}
        title={playground.concept}
        className="block bg-white" 
      />
    </div>
  );
}
