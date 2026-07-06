"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, CheckCircle, Globe } from "@/components/icons";
import Link from "next/link";
import { useCreateOrganization } from "@/hooks";
import { useOnboardingStore } from "@/lib/store";
import { BrandingSidebar } from "@/components/onboarding/branding-sidebar";
import { useEnhancedFormValidation, useLoadingState } from "@/hooks/common";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";
import { ErrorMessage } from "@/components/common/error-message";
import { generateSubdomain } from "@/lib/utils/validation";
import { useDebounce } from "@/hooks/common";
import { MAIN_DOMAIN } from "@/lib/constants";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { setOrganizationData, organizationData } = useOnboardingStore();
  const createOrganizationMutation = useCreateOrganization();

  // Form validation
  const {
    updateField,
    validateFieldOnBlur,
    validateAllFields,
    getFieldValue,
    getFieldError,
    isFieldValid,
    isFormValid,
    isFieldValidating,
  } = useEnhancedFormValidation({
    organizationName: "",
    subdomain: "",
  });

  // Loading state management
  const { isLoading, error, setError, executeWithLoading } = useLoadingState({
    autoReset: true,
  });

  // Debounced subdomain generation
  const debouncedOrganizationName = useDebounce(
    getFieldValue("organizationName"),
    500
  );

  // Pre-fill form if data exists
  useEffect(() => {
    if (organizationData?.name) {
      updateField("organizationName", organizationData.name);
    }
  }, [organizationData, updateField]);

  // Generate subdomain when organization name changes
  useEffect(() => {
    if (debouncedOrganizationName && debouncedOrganizationName.length >= 3) {
      const generatedSubdomain = generateSubdomain(debouncedOrganizationName);
      updateField("subdomain", generatedSubdomain);
    }
  }, [debouncedOrganizationName, updateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateAllFields()) {
      setError("Please fix the form errors before submitting");
      return;
    }

    try {
      await executeWithLoading(async () => {
        const result = (await createOrganizationMutation.mutateAsync({
          name: getFieldValue("organizationName").trim(),
          subdomain: getFieldValue("subdomain"),
        })) as {
          success: boolean;
          data?: { id: string; name: string; domain: string };
        };

        if (result.success && result.data) {
          // Save organization data to store
          setOrganizationData({
            id: result.data.id,
            name: result.data.name,
            domain: result.data.domain,
          });

          // Navigate to admin registration
          router.push("/register-admin");
        }
      });
    } catch (error: unknown) {
      setError(getFriendlyErrorMessage(error));
    }
  };

  const isFormValidComplete =
    isFormValid &&
    getFieldValue("organizationName").trim().length >= 3 &&
    getFieldValue("subdomain").length >= 3;

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Branding */}
      <BrandingSidebar />

      {/* Right Side - Organization Form */}
      <div className="flex-1 lg:w-3/5 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg max-h-screen overflow-hidden">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                  1
                </div>
                <span className="text-sm font-medium">Create Organization</span>
              </div>
              <span className="text-xs text-muted-foreground">Step 1 of 4</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div className="bg-primary h-1.5 rounded-full w-1/4 transition-all duration-300"></div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-1">Create Your Organization</h2>
            <p className="text-sm text-muted-foreground">
              Set up your platform with a unique organization name
            </p>
          </div>

          {/* Organization Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Organization Details</CardTitle>
              <CardDescription className="text-sm">
                Choose a name for your organization. This will be used to
                identify your platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSubmit} className="space-y-3">
                <ErrorMessage error={error} />

                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <div className="relative">
                    <Input
                      id="organizationName"
                      type="text"
                      placeholder="e.g., MIT University, Tech Academy"
                      value={getFieldValue("organizationName")}
                      onChange={(e) =>
                        updateField("organizationName", e.target.value)
                      }
                      onBlur={() => validateFieldOnBlur("organizationName")}
                      className={`pr-10 ${
                        getFieldError("organizationName")
                          ? "border-destructive"
                          : ""
                      }`}
                      required
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isFieldValidating("organizationName") ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : isFieldValid("organizationName") &&
                        getFieldValue("organizationName").length >= 3 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : getFieldError("organizationName") ? (
                        <CheckCircle className="h-4 w-4 text-destructive" />
                      ) : null}
                    </div>
                  </div>
                  {getFieldError("organizationName") && (
                    <p className="text-sm text-destructive">
                      {getFieldError("organizationName")}
                    </p>
                  )}
                  {isFieldValid("organizationName") &&
                    getFieldValue("organizationName").length >= 3 &&
                    !isFieldValidating("organizationName") && (
                      <p className="text-sm text-green-600">
                        Organization name is available
                      </p>
                    )}
                </div>

                {/* Subdomain Preview */}
                {getFieldValue("subdomain") && (
                  <div className="space-y-2">
                    <Label>Your Platform URL</Label>
                    <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">
                        {getFieldValue("subdomain")}.{MAIN_DOMAIN}
                      </span>
                      <div className="ml-auto">
                        {isFieldValidating("subdomain") ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : isFieldValid("subdomain") ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : getFieldError("subdomain") ? (
                          <CheckCircle className="h-4 w-4 text-destructive" />
                        ) : null}
                      </div>
                    </div>
                    {getFieldError("subdomain") && (
                      <p className="text-sm text-destructive">
                        {getFieldError("subdomain")}
                      </p>
                    )}
                    {isFieldValid("subdomain") && (
                      <p className="text-sm text-green-600">
                        Great! This subdomain is available.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-9"
                  disabled={
                    !isFormValidComplete ||
                    createOrganizationMutation.isPending ||
                    isLoading
                  }
                >
                  {isLoading || createOrganizationMutation.isPending
                    ? "Creating..."
                    : "Create Organization"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Back to Home */}
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
