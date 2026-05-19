"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ErrorMessage } from "@/components/common/error-message";

interface UsernameStepProps {
  username: string;
  onUsernameChange: (username: string) => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export function UsernameStep({
  username,
  onUsernameChange,
  onSubmit,
  onBack,
  isLoading,
  error,
}: UsernameStepProps) {
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && username.trim()) {
      await onSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <ErrorMessage error={error} />

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          disabled={isLoading}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          This will be your display name
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1"
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          className="flex-1"
          disabled={!username.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </div>
    </div>
  );
}
