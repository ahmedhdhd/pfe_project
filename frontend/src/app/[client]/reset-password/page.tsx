"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStudentResetPassword } from "@/hooks/api";
import { ClientProvider, useClient } from "@/components/client/client-provider";
import { Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Lock, ArrowLeft } from "@/components/icons";

function ClientResetPasswordContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { client, isLoading: clientLoading } = useClient();

  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetPasswordMutation = useStudentResetPassword();

  useEffect(() => {
    if (!clientLoading && !client) {
      setError("Organization not found");
    }
  }, [clientLoading, client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: formData.password,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push(`/${client?.subdomain}/login`);
      }, 2000);
    } catch (err: unknown) {
      const errMsg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to reset password. Please try again.";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link href={`/${client?.subdomain}/forgot-password`} className="text-primary hover:underline">
            Request a new reset link
          </Link>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <div className="mb-6">
            <div className="w-16 h-16 rounded-lg overflow-hidden mx-auto mb-4 shrink-0">
              <img
                src={client?.logo || "/images/Logo.png"}
                alt={client?.name || "Organization"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-4">Password Reset Successful</h1>
          <p className="text-muted-foreground mb-6">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirecting to login...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-muted/20 flex">
      <div className="hidden lg:flex lg:w-2/5 bg-linear-to-br from-primary to-primary/80 flex-col justify-center p-8 text-white">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md"
        >
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <img
                  src={client?.logo || "/images/Logo.png"}
                  alt={client?.name || ""}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{client?.name}</h1>
                <p className="text-primary-foreground/80">Learning Platform</p>
              </div>
            </div>
            <p className="text-primary-foreground/80">
              Create a new password for your account. Make sure to choose a strong password.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 lg:w-3/5 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                <img
                  src={client?.logo || "/images/Logo.png"}
                  alt={client?.name || ""}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">{client?.name}</h1>
                <p className="text-sm text-muted-foreground">Learning Platform</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>Enter your new password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a new password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-9"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-9"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <div className="text-center">
                  <Button variant="ghost" asChild>
                    <Link href={`/login`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function ClientResetPassword() {
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
        <ClientResetPasswordContent />
      </ClientProvider>
    </Suspense>
  );
}