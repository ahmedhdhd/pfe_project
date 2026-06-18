"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
} from "@/components/icons";
import apiClient from "@/lib/api/client";
import type { ApiResponse, CreateOrganizationConfigData } from "@/lib/types/api";

interface AiSettingsTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: React.Dispatch<React.SetStateAction<CreateOrganizationConfigData>>;
}

export function AiSettingsTab({ formData, setFormData }: AiSettingsTabProps) {
  const [showOpenRouterApiKey, setShowOpenRouterApiKey] = useState(false);
  const [isTestingOpenRouter, setIsTestingOpenRouter] = useState(false);
  const [testOpenRouterResult, setTestOpenRouterResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const openRouterApiKey = (formData as any).openRouterApiKey || "";
  const isConfigured = openRouterApiKey.trim().length > 0;

  const handleOpenRouterApiKeyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      openRouterApiKey: value,
    } as any));
    setTestOpenRouterResult(null);
  };

  const handleTestOpenRouterConnection = async () => {
    if (!openRouterApiKey.trim()) {
      setTestOpenRouterResult({
        success: false,
        message: "Please enter an OpenRouter API key first.",
      });
      return;
    }

    setIsTestingOpenRouter(true);
    setTestOpenRouterResult(null);

    try {
      const res = await apiClient.post<
        ApiResponse<{ valid?: boolean; message?: string }>
      >("/api/ai/test-openrouter-key", {
        apiKey: openRouterApiKey.trim(),
        testEmbeddings: true,
      });
      const payload = res.data;
      const inner = payload.data as { valid?: boolean; message?: string } | undefined;
      const ok = Boolean(payload.success && inner?.valid === true);
      setTestOpenRouterResult({
        success: ok,
        message:
          inner?.message ||
          (ok
            ? "OpenRouter chat and RAG embeddings are working."
            : "Connection check failed."),
      });
    } catch (error: any) {
      setTestOpenRouterResult({
        success: false,
        message:
          error?.response?.data?.message ||
          "Failed to verify OpenRouter. Check the key and OPENROUTER_EMBEDDING_MODEL on the server.",
      });
    } finally {
      setIsTestingOpenRouter(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Configuration</CardTitle>
                <CardDescription>
                  All AI features use OpenRouter (e.g. DeepSeek for chat). The
                  same key powers course search (embeddings) via{" "}
                  <code className="text-xs bg-muted px-1 rounded">
                    OPENROUTER_EMBEDDING_MODEL
                  </code>{" "}
                  on the server.
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={isConfigured ? "default" : "secondary"}
              className={
                isConfigured
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-muted text-muted-foreground"
              }
            >
              {isConfigured ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Configured
                </>
              ) : (
                <>
                  <XCircle className="mr-1 h-3 w-3" />
                  Not configured
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            OpenRouter API key
          </CardTitle>
          <CardDescription>
            Used for student AI tutor (chat), teacher playground HTML, and RAG
            embeddings. Get a key at{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline font-medium"
            >
              openrouter.ai/keys
            </a>
            . Set chat model with{" "}
            <code className="text-xs bg-muted px-1 rounded">OPENROUTER_MODEL</code>{" "}
            and embedding model with{" "}
            <code className="text-xs bg-muted px-1 rounded">
              OPENROUTER_EMBEDDING_MODEL
            </code>{" "}
            in the backend <code className="text-xs bg-muted px-1 rounded">.env</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openrouter-api-key">API Key</Label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openrouter-api-key"
                  type={showOpenRouterApiKey ? "text" : "password"}
                  value={openRouterApiKey}
                  onChange={(e) => handleOpenRouterApiKeyChange(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowOpenRouterApiKey(!showOpenRouterApiKey)}
                >
                  {showOpenRouterApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestOpenRouterConnection}
                disabled={isTestingOpenRouter || !openRouterApiKey.trim()}
                className="shrink-0"
              >
                {isTestingOpenRouter ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Test key
                    </>
                  )}
              </Button>
            </div>

            {testOpenRouterResult && (
              <div
                className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                  testOpenRouterResult.success
                    ? "bg-green-500/10 text-green-600 border border-green-500/20"
                    : "bg-red-500/10 text-red-600 border border-red-500/20"
                }`}
              >
                {testOpenRouterResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {testOpenRouterResult.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-powered features
          </CardTitle>
          <CardDescription>
            Enabled when a valid OpenRouter key is saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-500" />
                </div>
                <h4 className="font-medium text-sm">AI Tutor Chat</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                DeepSeek (or your OPENROUTER_MODEL) with course context and RAG.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </div>
                <h4 className="font-medium text-sm">AI Playground</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Teachers generate interactive HTML widgets via OpenRouter.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-green-500" />
                </div>
                <h4 className="font-medium text-sm">Content indexing (RAG)</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Embeddings use the same key; default model targets 3072-dim
                vectors for pgvector.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
