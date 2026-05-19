"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/common/otp-input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ErrorMessage } from "@/components/common/error-message";

interface OtpStepProps {
  otp: string;
  countryCode: string;
  phoneNumber: string;
  onOtpChange: (otp: string) => void;
  onOtpComplete: (otp: string) => void;
  onBack: () => void;
  onResend: () => void;
  resendTimer: number;
  isLoading: boolean;
  isVerifying: boolean;
  error: string | null;
}

export function OtpStep({
  otp,
  onOtpChange,
  onOtpComplete,
  onBack,
  onResend,
  resendTimer,
  isLoading,
  isVerifying,
  error,
}: OtpStepProps) {
  return (
    <div className="space-y-4">
      <ErrorMessage error={error} />

      <div className="space-y-2">
        <Label>Enter 6-digit OTP</Label>
        <OtpInput
          length={6}
          value={otp}
          onChange={onOtpChange}
          onComplete={onOtpComplete}
          disabled={isLoading}
          error={!!error}
        />
        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Verifying OTP...</span>
          </div>
        )}
        <p className="text-xs text-center text-muted-foreground">
          OTP will be verified automatically
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full"
          disabled={isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Change Number
        </Button>
      </div>

      <div className="text-center">
        <Button
          type="button"
          variant="link"
          onClick={onResend}
          disabled={resendTimer > 0}
          className="text-sm"
        >
          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
        </Button>
      </div>
    </div>
  );
}
