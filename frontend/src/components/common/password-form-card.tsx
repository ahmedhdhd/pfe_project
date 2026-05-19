"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { ErrorMessage } from "@/components/common/error-message";
import { PasswordStrengthIndicator } from "@/components/common/password-strength-indicator";

interface PasswordFormCardProps {
  password: string;
  confirmPassword: string;
  passwordError?: string;
  confirmPasswordError?: string;
  error?: string | null | undefined;
  isLoading?: boolean;
  isFormValid?: boolean;
  showBackButton?: boolean;
  backButtonHref?: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPasswordBlur: () => void;
  onConfirmPasswordBlur: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function PasswordFormCard({
  password,
  confirmPassword,
  passwordError,
  confirmPasswordError,
  error,
  isLoading = false,
  isFormValid = false,
  showBackButton = false,
  backButtonHref = "/verify-email",
  onPasswordChange,
  onConfirmPasswordChange,
  onPasswordBlur,
  onConfirmPasswordBlur,
  onSubmit,
}: PasswordFormCardProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Setup</CardTitle>
        <CardDescription>
          Choose a strong password to secure your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <ErrorMessage error={error ?? null} />

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                onBlur={onPasswordBlur}
                className="pr-20"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>

          {/* Password Strength Indicator */}
          <PasswordStrengthIndicator password={password} />

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                onBlur={onConfirmPasswordBlur}
                className="pr-20"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPasswordError && (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? "Setting Password..." : "Set Password"}
          </Button>
        </form>

        {/* Back button */}
        {showBackButton && (
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link href={backButtonHref}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Email Verification
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
