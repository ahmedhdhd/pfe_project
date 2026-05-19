"use client";

import { useRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  className,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(
    value.split("").slice(0, length).concat(Array(length).fill(""))
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Sync external value with internal state
    const newOtp = value
      .split("")
      .slice(0, length)
      .concat(Array(Math.max(0, length - value.length)).fill(""));
    setOtp(newOtp);
  }, [value, length]);

  const handleChange = (index: number, newValue: string) => {
    // Only allow digits
    const digit = newValue.replace(/\D/g, "").slice(-1);

    const newOtp = [...otp];

    if (digit) {
      // Add digit
      newOtp[index] = digit;
      setOtp(newOtp);

      const otpValue = newOtp.join("").slice(0, length);
      onChange(otpValue);

      // Auto-focus next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // All inputs filled, trigger onComplete
        if (otpValue.length === length && onComplete) {
          console.log(
            "OTP Input: All digits filled, calling onComplete with:",
            otpValue
          );
          onComplete(otpValue);
        }
      }
    } else {
      // Clear current digit
      newOtp[index] = "";
      setOtp(newOtp);
      const otpValue = newOtp.join("").slice(0, length);
      onChange(otpValue);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      if (otp[index]) {
        // Clear current digit if it has a value
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
        const otpValue = newOtp.join("").slice(0, length);
        onChange(otpValue);
      } else if (index > 0) {
        // Move to previous input on backspace if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    const digits = pastedData.slice(0, length).split("");

    if (digits.length > 0) {
      const newOtp = [...otp];
      digits.forEach((digit, idx) => {
        if (idx < length) {
          newOtp[idx] = digit;
        }
      });
      setOtp(newOtp);

      const otpValue = newOtp.join("").slice(0, length);
      onChange(otpValue);

      // Focus the next empty input or the last one
      const nextEmptyIndex = Math.min(digits.length, length - 1);
      inputRefs.current[nextEmptyIndex]?.focus();

      // Trigger onComplete if all filled
      if (otpValue.length === length && onComplete) {
        console.log(
          "OTP Input: Paste complete, calling onComplete with:",
          otpValue
        );
        onComplete(otpValue);
      }
    }
  };

  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "h-12 w-12 text-center text-lg font-semibold",
            error && "border-destructive focus-visible:border-destructive"
          )}
          aria-label={`OTP digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
