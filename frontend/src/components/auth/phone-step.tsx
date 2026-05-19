"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/common/phone-input";
import { Phone, Loader2, CheckCircle2 } from "lucide-react";
import { ErrorMessage } from "@/components/common/error-message";

interface PhoneStepProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (phone: string) => void;
  onGetOtp: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const PHONE_LENGTH = 10;

export function PhoneStep({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  onGetOtp,
  isLoading,
  error,
}: PhoneStepProps) {
  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const isValid = phoneDigits.length === PHONE_LENGTH;

  const handlePhoneChange = (phone: string) => {
    onPhoneNumberChange(phone);
  };

  const handleBlur = () => {
    // No validation on blur
  };

  const handleSubmit = async () => {
    if (isValid) {
      await onGetOtp();
    }
  };

  const displayError = error;

  return (
    <div className="space-y-4">
      <ErrorMessage error={displayError} />

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base font-medium">
          Phone Number
        </Label>
        <div className="space-y-1">
          <PhoneInput
            countryCode={countryCode}
            phoneNumber={phoneNumber}
            onCountryCodeChange={onCountryCodeChange}
            onPhoneNumberChange={handlePhoneChange}
            onEnter={handleSubmit}
            onBlur={handleBlur}
            disabled={isLoading}
            error={!!displayError}
            placeholder="Enter 10-digit phone number"
          />

          {/* Phone number status indicator */}
          {isValid && phoneDigits.length > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-600 font-medium">
                  Valid phone number
                </span>
              </div>
              <span className="text-muted-foreground">
                {countryCode} {phoneNumber}
              </span>
            </div>
          )}

          {/* Helper text */}
          {phoneDigits.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Enter your 10-digit mobile number to receive OTP
            </p>
          )}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        className="w-full"
        disabled={!isValid || isLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending OTP...
          </>
        ) : (
          <>
            <Phone className="mr-2 h-4 w-4" />
            Send OTP
          </>
        )}
      </Button>
    </div>
  );
}
