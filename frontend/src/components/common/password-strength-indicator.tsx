"use client";

import { Progress } from "@/components/ui/progress";
import { calculatePasswordStrength } from "@/lib/utils/validation";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const passwordStrength = calculatePasswordStrength(password);

  const strengthColor =
    passwordStrength.score >= 75
      ? "bg-green-500"
      : passwordStrength.score >= 50
      ? "bg-yellow-500"
      : passwordStrength.score >= 25
      ? "bg-orange-500"
      : "bg-red-500";

  const strengthLabel =
    passwordStrength.score >= 75
      ? "Strong"
      : passwordStrength.score >= 50
      ? "Medium"
      : passwordStrength.score >= 25
      ? "Weak"
      : "Very Weak";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength</span>
        <span
          className={`font-medium ${
            passwordStrength.score >= 75
              ? "text-green-600"
              : passwordStrength.score >= 50
              ? "text-yellow-600"
              : passwordStrength.score >= 25
              ? "text-orange-600"
              : "text-red-600"
          }`}
        >
          {strengthLabel}
        </span>
      </div>
      <Progress value={passwordStrength.score} className="h-2" />
      <div className="flex space-x-1">
        <div
          className={`h-1 flex-1 rounded-full ${
            passwordStrength.score >= 25 ? strengthColor : "bg-muted"
          }`}
        />
        <div
          className={`h-1 flex-1 rounded-full ${
            passwordStrength.score >= 50 ? strengthColor : "bg-muted"
          }`}
        />
        <div
          className={`h-1 flex-1 rounded-full ${
            passwordStrength.score >= 75 ? strengthColor : "bg-muted"
          }`}
        />
        <div
          className={`h-1 flex-1 rounded-full ${
            passwordStrength.score >= 100 ? strengthColor : "bg-muted"
          }`}
        />
      </div>
    </div>
  );
}
