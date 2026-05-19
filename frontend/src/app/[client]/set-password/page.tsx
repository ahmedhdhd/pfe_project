"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useStudentSetPassword, useStudentLogin } from "@/hooks/api";
import { useStudentAuthStore } from "@/lib/store/student-auth";
import { useEnhancedFormValidation, useLoadingState } from "@/hooks/common";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { ClientProvider, useClient } from "@/components/client/client-provider";
import { SetPasswordSidebar } from "@/components/common/set-password-sidebar";
import { PasswordFormCard } from "@/components/common/password-form-card";

// Client Student Set Password Component
function ClientStudentSetPasswordContent() {
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const { client } = useClient();
  const { studentData, userId, setPasswordSet, completeStudentAuth } =
    useStudentAuthStore();
  const setPasswordMutation = useStudentSetPassword();
  const loginMutation = useStudentLogin();

  // Form validation
  const {
    updateField,
    validateFieldOnBlur,
    validateAllFields,
    getFieldValue,
    getFieldError,
    isFormValid,
  } = useEnhancedFormValidation({
    password: "",
    confirmPassword: "",
  });

  // Loading state management
  const { isLoading, error, setError, executeWithLoading } = useLoadingState({
    autoReset: true,
  });

  // Initialize
  useEffect(() => {
    // Redirect to login since password is now set during registration
    const redirectTimer = setTimeout(() => {
      if (client?.subdomain) {
        window.location.href = `/login`;
      } else {
        setIsInitializing(false);
      }
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [client?.subdomain]);

  const handlePasswordChange = (value: string) => {
    updateField("password", value);
    // Re-validate confirm password if it has a value
    if (getFieldValue("confirmPassword")) {
      updateField("confirmPassword", getFieldValue("confirmPassword"));
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    updateField("confirmPassword", value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateAllFields()) {
      setError("Please fix the form errors before submitting");
      return;
    }

    if (!userId) {
      setError(
        "User information is missing. Please try again or contact support."
      );
      return;
    }

    try {
      await executeWithLoading(async () => {
        // Start showing the multi-step loader
        setIsPasswordSet(true);

        // Set the password
        await setPasswordMutation.mutateAsync({
          userId: userId,
          password: getFieldValue("password"),
        });

        setPasswordSet(true);

        // Complete student auth
        completeStudentAuth();

        // Auto-login the student after password setup
        if (studentData?.email && getFieldValue("password")) {
          try {
            console.log("Auto-logging in student:", studentData.email);
            await loginMutation.mutateAsync({
              email: studentData.email,
              password: getFieldValue("password"),
            });

            // Login hook will handle redirect to student dashboard
            return;
          } catch (loginError) {
            console.error("Auto-login failed:", loginError);
            // If auto-login fails, redirect to login page
            setTimeout(() => {
              window.location.href = `/${client?.subdomain}/login`;
            }, 2000);
            return;
          }
        }

        // Fallback: redirect to login page if no student data
        setTimeout(() => {
          window.location.href = `/${client?.subdomain}/login`;
        }, 4000);
      });
    } catch (error: unknown) {
      setError(getFriendlyErrorMessage(error));
    }
  };

  const onboardingSteps = [
    { text: "Setting up your account" },
    { text: "Creating your secure profile" },
    { text: "Logging you in automatically" },
    { text: `Welcome to ${client?.name || "TeslaAcademy"}!` },
  ];

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Multi-step loader - shown during password setup */}
      {isPasswordSet && !isInitializing && (
        <MultiStepLoader
          loadingStates={onboardingSteps}
          loading={isPasswordSet}
          duration={1500}
          loop={false}
        />
      )}

      <div className="min-h-screen flex overflow-hidden">
        {/* Left Side - Progress State */}
        <SetPasswordSidebar
          clientName={client?.name || "Organization"}
          clientLogo={client?.logo || "/images/Logo.png"}
        />

        {/* Right Side - Password Form */}
        <div className="flex-1 lg:w-3/5 flex items-center justify-center p-6 bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-lg"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Set Your Password</h2>
              <p className="text-muted-foreground">
                Create a secure password for your account
              </p>
            </div>

            {/* Password Form */}
            <PasswordFormCard
              password={getFieldValue("password")}
              confirmPassword={getFieldValue("confirmPassword")}
              passwordError={getFieldError("password")}
              confirmPasswordError={getFieldError("confirmPassword")}
              error={error}
              isLoading={isLoading || setPasswordMutation.isPending}
              isFormValid={isFormValid}
              showBackButton={true}
              backButtonHref="/verify-email"
              onPasswordChange={handlePasswordChange}
              onConfirmPasswordChange={handleConfirmPasswordChange}
              onPasswordBlur={() => validateFieldOnBlur("password")}
              onConfirmPasswordBlur={() =>
                validateFieldOnBlur("confirmPassword")
              }
              onSubmit={handleSubmit}
            />
          </motion.div>
        </div>
      </div>
    </>
  );
}

export default function ClientStudentSetPassword() {
  const params = useParams();
  const clientSlug = params.client as string;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ClientProvider subdomain={clientSlug}>
        <ClientStudentSetPasswordContent />
      </ClientProvider>
    </Suspense>
  );
}
