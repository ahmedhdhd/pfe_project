"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  content: string;
  timestamp: Date;
}

// ── Smart Rule-Based Responder ──
const QUICK_SUGGESTIONS = [
  "How do I enroll?",
  "My progress",
  "Certificates",
  "Live sessions",
];

function getBotResponse(input: string): string {
  const q = input.toLowerCase().trim();

  if (q === "help" || q === "commands" || q === "?") {
    return "I can help you with:\n\n• **Courses** — How to find and enroll\n• **Progress** — Your learning stats\n• **Certificates** — How to earn them\n• **Live Sessions** — Upcoming classes\n• **Profile** — Managing your account\n\nJust ask about any of these topics!";
  }

  if (q.includes("enroll") || q.includes("join") || q.includes("sign up") || q.includes("buy")) {
    return "To enroll in a course:\n\n1. Go to **Explore** from the top menu\n2. Browse available courses\n3. Click **View Details** on any course\n4. Hit **Enroll** or **Buy Now**\n\nFree courses can be enrolled instantly!";
  }

  if (q.includes("progress") || q.includes("how am i doing") || q.includes("stats") || q.includes("status")) {
    return "You can check your learning progress on the **My Learning** page — it shows your enrolled courses, completion percentage, and watch time. Look for the progress panel on the right side of the dashboard!";
  }

  if (q.includes("certificate") || q.includes("credential")) {
    return "Certificates are awarded when you complete a course. Head to **Certificates** in the top navigation to view and download your earned certificates. Keep up your learning streak! 🎓";
  }

  if (q.includes("schedule") || q.includes("live") || q.includes("class") || q.includes("session")) {
    return "Check **Live Sessions** in the top menu to see upcoming classes. You'll find the schedule, join links, and session recordings there. Make sure to join on time! 📅";
  }

  if (q.includes("profile") || q.includes("account") || q.includes("settings") || q.includes("edit")) {
    return "You can manage your profile by clicking on your **avatar** in the top-right corner, then selecting **Profile**. From there you can update your name, phone, and profile picture.";
  }

  if (q.includes("assignment") || q.includes("homework") || q.includes("practice")) {
    return "Assignments are available inside your courses. Open a course lesson, complete the assignment questions or file submission, then submit your work for review.";
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("good")) {
    return "Hello! 👋 I'm your Study Assistant. How can I help you today? You can ask me about courses, progress, certificates, or anything about the platform.";
  }

  if (q.includes("thank") || q.includes("thanks")) {
    return "You're welcome! Happy to help. Keep up the great learning! 🚀";
  }

  // Fallback
  return "I'm here to help! Try asking about:\n\n• How to enroll in courses\n• Your learning progress\n• Certificates\n• Live sessions schedule\n• Your profile settings\n\nOr type **help** to see all topics.";
}

// ── Chatbot Widget Component ──
export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hi there! 👋 I'm your Study Assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const response = getBotResponse(trimmed);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "bot",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 600);
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    // Send immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: suggestion,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const response = getBotResponse(suggestion);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "bot",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 600);
    setInput("");
  };

  // Simple markdown-like rendering for bold text
  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Handle newlines
      return part.split("\n").map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="chatbot-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center",
          "h-14 w-14 rounded-full shadow-lg",
          "bg-primary text-primary-foreground",
          "transition-all duration-300 ease-out",
          "hover:scale-105 hover:shadow-xl",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isOpen && "scale-0 opacity-0 pointer-events-none",
          !isOpen && "scale-100 opacity-100"
        )}
        aria-label="Open chat assistant"
      >
        <MessageCircle className="h-6 w-6" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-float-pulse" />
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-[380px] max-h-[520px] flex flex-col",
          "rounded-2xl shadow-2xl border border-border",
          "bg-background overflow-hidden",
          "transition-all duration-300 ease-out origin-bottom-right",
          isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4 pointer-events-none"
        )}
        role="dialog"
        aria-label="Chat assistant"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary-foreground/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Study Assistant</h3>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-xs opacity-80">Online</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-primary-foreground/20 transition-colors"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 max-h-[340px] chatbot-scroll">
          <div className="px-4 py-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2.5 animate-fade-in",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-xs",
                    msg.role === "bot"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {msg.role === "bot" ? (
                    <Bot className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    msg.role === "bot"
                      ? "bg-muted text-foreground rounded-bl-md"
                      : "bg-primary text-primary-foreground rounded-br-md"
                  )}
                >
                  {renderContent(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 text-muted-foreground">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Suggestions (shown when few messages) */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestion(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your courses..."
              className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={cn(
                "flex items-center justify-center h-10 w-10 rounded-xl transition-all",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .chatbot-scroll
          [data-slot="scroll-area-scrollbar"][data-orientation="vertical"] {
          width: 12px;
          padding: 2px;
          opacity: 1;
        }

        .chatbot-scroll [data-slot="scroll-area-thumb"] {
          background-color: hsl(var(--primary) / 0.28);
        }

        .chatbot-scroll
          [data-slot="scroll-area-scrollbar"]:hover
          [data-slot="scroll-area-thumb"] {
          background-color: hsl(var(--primary) / 0.45);
        }
      `}</style>
    </>
  );
}
