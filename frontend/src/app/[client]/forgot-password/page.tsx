"use client";

import { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useStudentForgotPassword } from "@/hooks/api";
import { ClientProvider, useClient } from "@/components/client/client-provider";
import { Loader2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Mail, ArrowLeft } from "@/components/icons";

function ClientForgotPasswordContent() {
  const params = useParams();
  const { client, isLoading: clientLoading } = useClient();

  const [formData, setFormData] = useState({
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const forgotPasswordMutation = useStudentForgotPassword();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ email: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!client?.organizationId) {
      setError("Organization not found");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPasswordMutation.mutateAsync({
        email: formData.email,
        organizationId: client.organizationId,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const errMsg = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Failed to send reset link. Please try again.";
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
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            If an account exists with <strong>{formData.email}</strong>, we've sent a password reset link.
          </p>
          <div className="text-sm text-muted-foreground">
            <Link href={`/login`} className="text-primary hover:underline">
              Back to sign in
            </Link>
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
              Forgot your password? No worries. Enter your email and we'll send you a reset link.
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
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>Enter your email to reset your password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
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
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Remember your password?
                  </p>
                  <Button variant="ghost" asChild>
                    <Link href={`/login`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Sign in
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

export default function ClientForgotPassword() {
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
        <ClientForgotPasswordContent />
      </ClientProvider>
    </Suspense>
  );
}