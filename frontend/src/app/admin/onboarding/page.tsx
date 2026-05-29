"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Rocket, Send, SkipForward, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { OnboardingLivePreview } from "@/components/admin/onboarding/OnboardingLivePreview";
import { useCurrentUser } from "@/hooks";
import {
  useOnboardingChat,
  useParseOnboardingAnswer,
  useLaunchOnboarding,
  useSkipOnboarding,
  useOrganizationConfigAdmin,
} from "@/hooks/api";
import {
  countOnboardingProgress,
  mergeOnboardingPartial,
  ONBOARDING_TOTAL_STEPS,
  type OnboardingMessage,
  type OnboardingPartialConfig,
} from "@/lib/types/onboarding";
import { cn } from "@/lib/utils";

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { data: baseConfigData } = useOrganizationConfigAdmin();
  const baseConfig =
    baseConfigData?.success && baseConfigData.data
      ? baseConfigData.data
      : null;
  const chatMutation = useOnboardingChat();
  const parseMutation = useParseOnboardingAnswer();
  const launchMutation = useLaunchOnboarding();
  const skipMutation = useSkipOnboarding();

  const [messages, setMessages] = useState<OnboardingMessage[]>([]);
  const [input, setInput] = useState("");
  const [partialConfig, setPartialConfig] = useState<OnboardingPartialConfig>({});
  const [phase, setPhase] = useState<"chat" | "confirm" | "success">("chat");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const progressStep = countOnboardingProgress(partialConfig);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const runAssistantTurn = useCallback(
    async (history: OnboardingMessage[]) => {
      if (!user?.organizationId) return;
      setIsTyping(true);
      setError(null);
      try {
        const chatRes = await chatMutation.mutateAsync({
          messages: history,
          organizationId: user.organizationId,
        });
        if (chatRes.success && chatRes.data) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: chatRes.data.reply },
          ]);
          if (chatRes.data.done) {
            setPhase("confirm");
          }
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Could not reach the onboarding assistant.";
        setError(msg);
      } finally {
        setIsTyping(false);
      }
    },
    [chatMutation, user?.organizationId]
  );

  const parseAndUpdate = useCallback(
    async (history: OnboardingMessage[]) => {
      if (!user?.organizationId || history.length === 0) return;
      try {
        const parseRes = await parseMutation.mutateAsync({
          messages: history,
          organizationId: user.organizationId,
        });
        if (parseRes.success && parseRes.data) {
          setPartialConfig((prev) =>
            mergeOnboardingPartial(prev, parseRes.data)
          );
        }
      } catch {
        // Preview parse is best-effort; chat can still continue
      }
    },
    [parseMutation, user?.organizationId]
  );

  useEffect(() => {
    if (initialized || !user?.organizationId) return;
    setInitialized(true);
    void runAssistantTurn([]);
  }, [initialized, user, runAssistantTurn]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isTyping || !user?.organizationId) return;

    const nextHistory: OnboardingMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextHistory);
    setInput("");
    setIsTyping(true);

    await parseAndUpdate(nextHistory);
    await runAssistantTurn(nextHistory);
  };

  const handleSkip = async () => {
    setError(null);
    try {
      await skipMutation.mutateAsync();
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not skip setup.";
      setError(msg);
    }
  };

  const handleLaunch = async () => {
    if (!user?.organizationId || !user.organizationSlug) return;
    setError(null);
    try {
      await launchMutation.mutateAsync({
        organizationId: user.organizationId,
        slug: user.organizationSlug,
        partial: partialConfig,
      });
      setPhase("success");
      setTimeout(() => router.push("/admin/dashboard"), 2200);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to launch platform.";
      setError(msg);
    }
  };

  if (phase === "success") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Rocket className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Your platform is live!</h1>
        <p className="text-muted-foreground">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <span className="font-semibold truncate">
            {user?.hasCompletedOnboarding
              ? "AI Platform Designer"
              : "Tesla Academy Setup"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Step {Math.max(progressStep, 1)} of {ONBOARDING_TOTAL_STEPS}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSkip()}
            disabled={skipMutation.isPending || launchMutation.isPending}
          >
            {skipMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <SkipForward className="h-4 w-4 mr-1.5" />
                Skip
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Chat column */}
        <div className="flex flex-col flex-1 md:max-w-[480px] md:border-r min-h-[50vh] md:min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((msg, i) => (
              <div
                key={`${msg.role}-${i}`}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 max-w-[85%] text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-muted">
                  <TypingIndicator />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <p className="text-sm text-destructive px-4 pb-2">{error}</p>
          )}

          {phase === "confirm" ? (
            <div className="p-4 border-t space-y-4 bg-muted/20">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Ready to launch?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    <strong>Name:</strong> {partialConfig.name || "—"}
                  </p>
                  <p>
                    <strong>Hero:</strong> {partialConfig.heroTitle || "—"}
                  </p>
                  <p>
                    <strong>Language:</strong> {partialConfig.language || "—"}
                  </p>
                  <p>
                    <strong>Theme:</strong>{" "}
                    {partialConfig.themeColor ? (
                      <span
                        className="inline-block h-4 w-4 rounded border align-middle ml-1"
                        style={{ background: partialConfig.themeColor }}
                      />
                    ) : (
                      "—"
                    )}
                  </p>
                  <Button
                    className="w-full"
                    onClick={handleLaunch}
                    disabled={launchMutation.isPending}
                  >
                    {launchMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Launching…
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Launch my platform
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-4 border-t flex gap-2 shrink-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer…"
                rows={2}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={isTyping}
              />
              <Button
                size="icon"
                className="shrink-0 h-auto"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isTyping}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Preview column */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-muted/20 md:sticky md:top-0 md:h-[calc(100vh-57px)]">
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="space-y-1">
              <p className="text-sm font-medium">Live preview</p>
              <Progress
                value={(progressStep / ONBOARDING_TOTAL_STEPS) * 100}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                Real public homepage — updates as you chat
              </p>
            </div>
            <div className="h-[min(70vh,720px)]">
              <OnboardingLivePreview
                slug={user?.organizationSlug || ""}
                organizationId={user?.organizationId || ""}
                partial={partialConfig}
                baseConfig={baseConfig}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
