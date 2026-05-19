"use client";

import { useEffect } from "react";
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
import { ArrowLeft, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRegisterAdmin } from "@/hooks";
import { useOnboardingStore } from "@/lib/store/onboarding";
import { useEnhancedFormValidation, useLoadingState } from "@/hooks/common";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";
import { ErrorMessage } from "@/components/common/error-message";

export default function RegisterAdminPage() {
  const router = useRouter();
  const { organizationData, setAdminData, adminData } = useOnboardingStore();
  const registerAdminMutation = useRegisterAdmin();

  // Form validation
  const {
    updateField,
    validateFieldOnBlur,
    validateAllFields,
    getFieldValue,
    getFieldError,
    isFormValid,
    isFieldValidating,
  } = useEnhancedFormValidation({
    email: "",
    username: "",
  });

  // Loading state management
  const { isLoading, error, setError, executeWithLoading } = useLoadingState({
    autoReset: true,
  });

  // Redirect if no organization data
  useEffect(() => {
    if (!organizationData) {
      router.push("/create-organization");
    }
  }, [organizationData, router]);

  // Pre-fill form if data exists
  useEffect(() => {
    if (adminData) {
      updateField("email", adminData.email);
      updateField("username", adminData.username);
    }
  }, [adminData, updateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateAllFields()) {
      setError("Please fix the form errors before submitting");
      return;
    }

    if (!organizationData) {
      setError("Organization data is missing");
      return;
    }

    try {
      await executeWithLoading(async () => {
        const result = (await registerAdminMutation.mutateAsync({
          organizationId: organizationData.id,
          email: getFieldValue("email"),
          username: getFieldValue("username"),
        })) as {
          success: boolean;
          data?: { email: string; username: string; id: string };
        };

        if (result.success && result.data) {
          setAdminData({
            email: result.data.email,
            username: result.data.username,
            id: result.data.id,
          });

          router.push("/verify-email");
        }
      });
    } catch (error: unknown) {
      setError(getFriendlyErrorMessage(error));
    }
  };

  if (!organizationData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Organization Data</h1>
          <p className="text-muted-foreground mb-4">
            Please create an organization first.
          </p>
          <Button asChild>
            <Link href="/create-organization">Create Organization</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Organization Info */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-primary to-primary/80 flex-col justify-center p-8 text-white">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Create Admin Account</h1>
            <p className="text-primary-foreground/80">
              Set up your administrator account for {organizationData.name}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="text-sm">Organization created successfully</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
              <span className="text-sm">Ready to create admin account</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 lg:w-3/5 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Create Admin Account</h2>
            <p className="text-muted-foreground">
              Set up your administrator account for {organizationData.name}
            </p>
          </div>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Admin Registration</CardTitle>
              <CardDescription>
                Create your administrator account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <ErrorMessage error={error} />

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@yourorganization.com"
                      value={getFieldValue("email")}
                      onChange={(e) => updateField("email", e.target.value)}
                      onBlur={() => validateFieldOnBlur("email")}
                      required
                    />
                    {isFieldValidating("email") && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                      </div>
                    )}
                  </div>
                  {getFieldError("email") && (
                    <p className="text-sm text-destructive">
                      {getFieldError("email")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin_username"
                    value={getFieldValue("username")}
                    onChange={(e) => updateField("username", e.target.value)}
                    onBlur={() => validateFieldOnBlur("username")}
                    required
                  />
                  {getFieldError("username") && (
                    <p className="text-sm text-destructive">
                      {getFieldError("username")}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading || registerAdminMutation.isPending || !isFormValid
                  }
                >
                  {isLoading || registerAdminMutation.isPending ? (
                    "Creating Account..."
                  ) : (
                    <>
                      Create Admin Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Button variant="outline" asChild>
                  <Link href="/create-organization">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Organization
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
