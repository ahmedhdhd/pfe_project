"use client";

import { useState, useEffect } from "react";
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
import { Mail, Lock, Loader2 } from "lucide-react";
import { useLogin, useLogout } from "@/hooks/api";
import { BrandingSidebar } from "@/components/onboarding/branding-sidebar";
import { tokenManager } from "@/lib/api/client";
import { useEnhancedFormValidation, useLoadingState } from "@/hooks/common";
import { ErrorMessage } from "@/components/common/error-message";
import { cookieStorage } from "@/lib/utils/storage";

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  // Form validation
  const {
    updateField,
    validateFieldOnBlur,
    validateAllFields,
    getFieldValue,
    getFieldError,
    isFormValid,
  } = useEnhancedFormValidation({
    email: "",
    password: "",
  });

  // Loading state management
  const { isLoading, error, setError } = useLoadingState({
    autoReset: true,
  });

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if user is already authenticated and redirect accordingly
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAuthAndRedirect = async () => {
      try {
        // Check if QUEZT_AUTH token exists in cookies
        const authData = cookieStorage.get<{
          token: string;
          user: { role: string };
        }>("QUEZT_AUTH");

        console.log(authData, "authData");
        if (
          authData &&
          typeof authData === "object" &&
          "token" in authData &&
          authData.token
        ) {
          const userData = authData.user;
          console.log(userData, "userData");
          if (userData) {
            // Redirect based on user role
            const userRole = (
              userData as { role?: string }
            ).role?.toLowerCase();
            switch (userRole) {
              case "admin":
                router.push("/admin/dashboard");
                return;
              case "teacher":
                router.push("/teacher/dashboard");
                return;
              case "student":
                // Redirect students to My Learning page
                router.push("/student/my-learning");
                return;
              default:
                router.push("/admin/dashboard");
                return;
            }
          }
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsCheckingAuth(false);
      }
    };

    const timer = setTimeout(checkAuthAndRedirect, 100);
    return () => clearTimeout(timer);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent form submission
    setError(null);

    if (!validateAllFields()) {
      setError("Please fix the form errors before submitting");
      return;
    }

    try {
      const result = await loginMutation.mutateAsync({
        email: getFieldValue("email"),
        password: getFieldValue("password"),
      });

      // Check if login was actually successful
      if (!result.success) {
        setError(result.message || "");
        return;
      }
    } catch (error: unknown) {
      // Extract error message directly from API response
      let errorMessage = "";

      if (error && typeof error === "object") {
        // Check for Axios error structure (when API returns HTTP error status)
        if ("response" in error) {
          const axiosError = error as {
            response?: { data?: { message?: string; success?: boolean } };
            message?: string;
          };
          // Extract message from response.data.message (API's actual message)
          errorMessage = axiosError.response?.data?.message || "";

          // Fallback to error.message if response.data.message is not available
          if (!errorMessage && axiosError.message) {
            errorMessage = axiosError.message;
          }
        }
        // Check for Error object with message (when API returns 200 with success:false)
        else if ("message" in error) {
          errorMessage = (error as { message: string }).message;
        }
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      // Only set error if we have a message
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setError("Invalid email or password. Please try again.");
      }

      console.error("Login error:", error);
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Left Side - Branding */}
      <BrandingSidebar
        title="Welcome Back"
        subtitle="Sign in to your dashboard"
        features={[
          "Access your account",
          "Manage your content",
          "Track your progress",
        ]}
      />

      {/* Right Side - Login Form */}
      <div className="flex-1 lg:w-3/5 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Sign In</h2>
            <p className="text-muted-foreground">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Sign in to your admin dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(error || loginMutation.error) && (
                  <ErrorMessage
                    error={
                      error ||
                      (loginMutation.error
                        ? (() => {
                            // Extract API message directly, don't use getFriendlyErrorMessage
                            // which might show generic messages
                            const err = loginMutation.error;
                            if (err && typeof err === "object") {
                              // Check for Axios error with response.data.message
                              if ("response" in err) {
                                const axiosError = err as {
                                  response?: { data?: { message?: string } };
                                  message?: string;
                                };
                                return (
                                  axiosError.response?.data?.message ||
                                  axiosError.message ||
                                  null
                                );
                              }
                              // Check for Error object with message
                              if ("message" in err) {
                                return (err as { message: string }).message;
                              }
                            }
                            return null;
                          })()
                        : null)
                    }
                  />
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@yourorganization.com"
                      value={getFieldValue("email")}
                      onChange={(e) => updateField("email", e.target.value)}
                      onBlur={() => validateFieldOnBlur("email")}
                      className="pl-10"
                      required
                    />
                  </div>
                  {getFieldError("email") && (
                    <p className="text-sm text-destructive">
                      {getFieldError("email")}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={getFieldValue("password")}
                      onChange={(e) => updateField("password", e.target.value)}
                      onBlur={() => validateFieldOnBlur("password")}
                      className="pl-10"
                      required
                    />
                  </div>
                  {getFieldError("password") && (
                    <p className="text-sm text-destructive">
                      {getFieldError("password")}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    isLoading || loginMutation.isPending || !isFormValid
                  }
                >
                  {isLoading || loginMutation.isPending
                    ? "Signing In..."
                    : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => router.push("/create-organization")}
                    >
                      Create Organization
                    </Button>
                  </p>
                </div>

                {tokenManager.isAuthenticated() && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Already logged in as{" "}
                      {tokenManager.getUser()?.username || "User"}
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => logoutMutation.mutate()}
                      className="w-full"
                    >
                      Logout and Sign In as Different User
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
