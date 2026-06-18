"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff } from "@/components/icons";
import { useSetPassword, useCreateOrganizationConfig, useLogin } from "@/hooks";
import { useOnboardingStore } from "@/lib/store/onboarding";
import { useEnhancedFormValidation, useLoadingState } from "@/hooks/common";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";
import { ErrorMessage } from "@/components/common/error-message";
import { calculatePasswordStrength } from "@/lib/utils/validation";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { CreateOrganizationConfigData } from "@/lib/types/api";

function SetPasswordContent() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [localUserId, setLocalUserId] = useState<string | null>(null);

  const router = useRouter();
  const {
    organizationData,
    adminData,
    emailVerified,
    userId: storeUserId,
    setPasswordSet,
    setOrganizationConfig,
    completeOnboarding,
  } = useOnboardingStore();
  const setPasswordMutation = useSetPassword();
  const createOrganizationConfigMutation = useCreateOrganizationConfig();
  const loginMutation = useLogin();

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

  // Get userId from store or admin data
  useEffect(() => {
    // Try to get userId from store first (from email verification)
    if (storeUserId) {
      setLocalUserId(storeUserId);
    } else if (adminData?.id) {
      // For admin onboarding flow, use adminData
      setLocalUserId(adminData.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize and handle redirects
  useEffect(() => {
    // Set initializing to false after a short delay to allow store to load
    const initTimer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);

    // Don't run redirect checks if password is already set (celebration screen)
    if (isPasswordSet) {
      return () => clearTimeout(initTimer);
    }

    // If we have userId from store (coming from email verification), no redirects needed
    if (storeUserId) {
      return () => clearTimeout(initTimer);
    }

    // Only run redirect checks for admin onboarding flow
    if (!isInitializing) {
      // If we have no data at all, redirect to create organization
      if (!adminData && !organizationData) {
        router.push("/create-organization");
        return;
      }

      // If we have admin data but no organization, redirect to create organization
      if (adminData && !organizationData) {
        router.push("/create-organization");
        return;
      }

      // If we have both but email not verified, redirect to verify email
      if (adminData && organizationData && !emailVerified) {
        router.push("/verify-email");
        return;
      }
    }

    return () => clearTimeout(initTimer);
  }, [
    adminData,
    organizationData,
    emailVerified,
    router,
    isInitializing,
    storeUserId,
    isPasswordSet,
  ]);

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

  // Helper function to create organization configuration data
  const createOrganizationConfigData = (): CreateOrganizationConfigData => {
    if (!organizationData) {
      throw new Error("Organization data is missing");
    }

    // Generate a default domain if not provided
    const domain =
      organizationData.domain ||
      `${organizationData.name
        .toLowerCase()
        .replace(/\s+/g, "-")}.teslaacademy.in`;

    // Extract slug from domain (e.g., "mit.teslaacademy.in" -> "mit")
    // Handle cases where domain might be malformed
    const domainParts = domain.split(".");
    const slug =
      domainParts?.length > 0
        ? domainParts[0]
        : organizationData?.name?.toLowerCase().replace(/\s+/g, "-");

    console.log(organizationData, "org data");

    return {
      organizationId: organizationData.id,
      name: organizationData.name,
      slug: slug,
      domain: domain,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateAllFields()) {
      setError("Please fix the form errors before submitting");
      return;
    }

    if (!localUserId) {
      setError(
        "User information is missing. Please try again or contact support."
      );
      return;
    }

    try {
      await executeWithLoading(async () => {
        // Start showing the multi-step loader
        setIsPasswordSet(true);

        // We'll handle the actual password setting here
        await setPasswordMutation.mutateAsync({
          userId: localUserId,
          password: getFieldValue("password"),
        });

        setPasswordSet(true);

        // Complete onboarding
        completeOnboarding();

        // Auto-login the admin after password setup
        if (adminData?.email && getFieldValue("password")) {
          try {
            console.log("Auto-logging in admin:", adminData.email);
            const loginResult = await loginMutation.mutateAsync({
              email: adminData.email,
              password: getFieldValue("password"),
            });

            // After successful login, create organization configuration
            if (loginResult.success && organizationData && adminData) {
              try {
                console.log(
                  "Creating organization config after login with data:",
                  {
                    organizationData,
                    adminData,
                    domain: organizationData?.domain,
                  }
                );

                const configData = createOrganizationConfigData();
                console.log("Generated config data:", configData);

                const configResult =
                  await createOrganizationConfigMutation.mutateAsync(
                    configData
                  );

                if (configResult.success && configResult.data) {
                  // Store the organization configuration
                  setOrganizationConfig(configResult.data);
                  console.log(
                    "Organization configuration created successfully:",
                    configResult.data
                  );
                }
              } catch (configError) {
                console.error(
                  "Failed to create organization configuration:",
                  configError
                );
                console.error("Organization data:", organizationData);
                console.error("Admin data:", adminData);
                // Don't fail the entire flow if config creation fails
              }
            } else {
              console.warn("Missing data for organization config creation:", {
                hasOrganizationData: !!organizationData,
                hasAdminData: !!adminData,
                loginSuccess: loginResult?.success,
                organizationData,
                adminData,
              });
            }

            // Login hook will handle redirect to admin dashboard
            return; // Exit early since login will redirect
          } catch (loginError) {
            console.error("Auto-login failed:", loginError);
            // If auto-login fails, redirect to login page
            setTimeout(() => {
              window.location.href = "/login";
            }, 2000);
            return;
          }
        }

        // Fallback: redirect to login page if no admin data
        setTimeout(() => {
          window.location.href = "/login";
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
    { text: "Configuring your organization" },
    { text: "Setting up organization branding" },
    { text: "Welcome to TeslaAcademy!" },
  ];

  const passwordStrength = calculatePasswordStrength(getFieldValue("password"));
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

      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
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
          <Card>
            <CardHeader>
              <CardTitle>Password Setup</CardTitle>
              <CardDescription>
                Choose a strong password to secure your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorMessage error={error} />

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={getFieldValue("password")}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      onBlur={() => validateFieldOnBlur("password")}
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
                  {getFieldError("password") && (
                    <p className="text-sm text-destructive">
                      {getFieldError("password")}
                    </p>
                  )}
                </div>

                {/* Password Strength Indicator */}
                {getFieldValue("password") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Password strength
                      </span>
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
                          passwordStrength.score >= 25
                            ? strengthColor
                            : "bg-muted"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          passwordStrength.score >= 50
                            ? strengthColor
                            : "bg-muted"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          passwordStrength.score >= 75
                            ? strengthColor
                            : "bg-muted"
                        }`}
                      />
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          passwordStrength.score >= 100
                            ? strengthColor
                            : "bg-muted"
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={getFieldValue("confirmPassword")}
                      onChange={(e) =>
                        handleConfirmPasswordChange(e.target.value)
                      }
                      onBlur={() => validateFieldOnBlur("confirmPassword")}
                      className="pr-20"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {getFieldError("confirmPassword") && (
                    <p className="text-sm text-destructive">
                      {getFieldError("confirmPassword")}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    !isFormValid || setPasswordMutation.isPending || isLoading
                  }
                >
                  {isLoading || setPasswordMutation.isPending
                    ? "Setting Password..."
                    : "Set Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
