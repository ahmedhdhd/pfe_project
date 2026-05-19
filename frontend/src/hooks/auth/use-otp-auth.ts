"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetOtp, useVerifyOtp, useUpdateProfile } from "@/hooks/api";
import { useLoadingState } from "@/hooks/common";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";

export type AuthStep = "phone" | "otp" | "username";

export interface UseOtpAuthProps {
  organizationId: string;
  onAuthSuccess?: () => void;
}

export interface UseOtpAuthReturn {
  // State
  step: AuthStep;
  countryCode: string;
  phoneNumber: string;
  otp: string;
  username: string;
  isExistingUser: boolean | null;
  otpSent: boolean;
  resendTimer: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCountryCode: (code: string) => void;
  setPhoneNumber: (phone: string) => void;
  setOtp: (otp: string) => void;
  setUsername: (username: string) => void;
  handleGetOtp: () => Promise<void>;
  handleVerifyOtp: (otpValue?: string) => Promise<void>;
  handleResendOtp: () => Promise<void>;
  handleUsernameSubmit: () => Promise<void>;
  handleBackToPhone: () => void;
  handleBackToOtp: () => void;
  setError: (error: string | null) => void;
}

export function useOtpAuth({
  organizationId,
  onAuthSuccess,
}: UseOtpAuthProps): UseOtpAuthReturn {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("phone");
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const getOtpMutation = useGetOtp();
  const verifyOtpMutation = useVerifyOtp();
  const updateProfileMutation = useUpdateProfile();

  const {
    isLoading: isSubmitting,
    error: submitError,
    setError,
    executeWithLoading,
  } = useLoadingState({
    autoReset: true,
  });

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleGetOtp = async () => {
    if (!organizationId) {
      setError("Organization information is missing. Please try again.");
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    try {
      await executeWithLoading(async () => {
        const result = await getOtpMutation.mutateAsync({
          countryCode,
          phoneNumber,
          organizationId,
        });

        if (result?.data?.isExistingUser !== undefined) {
          setIsExistingUser(result.data.isExistingUser);
          setOtpSent(true);
          setStep("otp");
          setResendTimer(60);
          setError(null);
        } else {
          setIsExistingUser(true);
          setOtpSent(true);
          setStep("otp");
          setResendTimer(60);
          setError(null);
        }
      });
    } catch (error: unknown) {
      const errorMessage = getFriendlyErrorMessage(error);
      setError(errorMessage);
    }
  };

  const handleVerifyOtp = async (otpValue?: string) => {
    if (!organizationId) {
      setError("Organization information is missing. Please try again.");
      return;
    }

    const currentOtp = otpValue || otp;

    if (!currentOtp || currentOtp.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    try {
      await executeWithLoading(async () => {
        await verifyOtpMutation.mutateAsync({
          countryCode,
          phoneNumber,
          otp: currentOtp,
          organizationId,
        });

        if (isExistingUser === false) {
          setStep("username");
        } else {
          router.push("/student/my-learning");
          onAuthSuccess?.();
        }
      });
    } catch (error: unknown) {
      setError(getFriendlyErrorMessage(error));
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtp("");
    await handleGetOtp();
  };

  const handleUsernameSubmit = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    try {
      await executeWithLoading(async () => {
        await updateProfileMutation.mutateAsync({
          username: username.trim(),
        });
        router.push("/student/my-learning");
        onAuthSuccess?.();
      });
    } catch (error: unknown) {
      setError(getFriendlyErrorMessage(error));
    }
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
    setOtpSent(false);
    setIsExistingUser(null);
  };

  const handleBackToOtp = () => {
    setStep("otp");
    setUsername("");
  };

  return {
    // State
    step,
    countryCode,
    phoneNumber,
    otp,
    username,
    isExistingUser,
    otpSent,
    resendTimer,
    isLoading:
      isSubmitting ||
      getOtpMutation.isPending ||
      verifyOtpMutation.isPending ||
      updateProfileMutation.isPending,
    error:
      submitError ||
      (getOtpMutation.error
        ? getFriendlyErrorMessage(getOtpMutation.error)
        : null) ||
      (verifyOtpMutation.error
        ? getFriendlyErrorMessage(verifyOtpMutation.error)
        : null) ||
      (updateProfileMutation.error
        ? getFriendlyErrorMessage(updateProfileMutation.error)
        : null) ||
      null,

    // Actions
    setCountryCode,
    setPhoneNumber,
    setOtp,
    setUsername,
    handleGetOtp,
    handleVerifyOtp,
    handleResendOtp,
    handleUsernameSubmit,
    handleBackToPhone,
    handleBackToOtp,
    setError,
  };
}
