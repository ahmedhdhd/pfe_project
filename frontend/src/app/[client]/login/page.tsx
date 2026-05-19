"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { ClientProvider, useClient } from "@/components/client/client-provider";
import { useStudentLogin } from "@/hooks/api";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { cookieStorage } from "@/lib/utils/storage";
import { useRouter } from "next/navigation";

function ClientLoginContent() {
  const router = useRouter();
  const params = useParams();
  const { client, isLoading: clientLoading } = useClient();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginMutation = useStudentLogin();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAuthAndRedirect = async () => {
      try {
        const authData = cookieStorage.get<{
          token: string;
          user: { role: string };
        }>("QUEZT_AUTH");

        if (
          authData &&
          typeof authData === "object" &&
          "token" in authData &&
          authData.token
        ) {
          const userData = authData.user;
          if (
            userData &&
            (userData as { role?: string }).role?.toLowerCase() === "student"
          ) {
            router.push(`/student/my-learning`);
            return;
          }
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsCheckingAuth(false);
      }
    };

    if (!clientLoading && client) {
      const timer = setTimeout(checkAuthAndRedirect, 100);
      return () => clearTimeout(timer);
    } else if (!clientLoading) {
      setIsCheckingAuth(false);
    }
  }, [router, params.client, clientLoading, client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!formData.password) {
      setError("Password is required");
      return;
    }
    if (!client?.organizationId) {
      setError("Organization not found");
      return;
    }

    setIsSubmitting(true);
    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        organizationId: client.organizationId,
      });
    } catch (err: unknown) {
      const errMsg = err && typeof err === "object" && "response" in err
        ? (err.response as { data?: { message?: string } })?.data?.message
        : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Login failed. Please try again.";
      setError(String(errMsg));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (clientLoading || isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">
            {isCheckingAuth ? "Checking authentication..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client Not Found</h1>
          <p className="text-muted-foreground">
            The requested client does not exist.
          </p>
          <Button asChild className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
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
                  src={client.logo || "/images/Logo.png"}
                  alt={client.name || ""}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <p className="text-primary-foreground/80">Learning Platform</p>
              </div>
            </div>
            <p className="text-primary-foreground/80">
              Welcome back! Sign in with your email to access your courses.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Mail className="h-4 w-4" />
              </div>
              <span className="text-sm">Sign in with email</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Lock className="h-4 w-4" />
              </div>
              <span className="text-sm">Secure authentication</span>
            </div>
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
                  src={client.logo || "/images/Logo.png"}
                  alt={client.name || ""}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold">{client.name}</h1>
                <p className="text-sm text-muted-foreground">Learning Platform</p>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Enter your email and password to access your account</CardDescription>
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

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
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
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-4 text-right">
                <Link
                  href={`/forgot-password`}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Don&apos;t have an account?
                  </p>
                  <Button variant="ghost" asChild>
                    <Link href={`/register`}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Register
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

export default function ClientLogin() {
  const params = useParams();
  const clientId = params.client as string;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ClientProvider domain={clientId}>
        <ClientLoginContent />
      </ClientProvider>
    </Suspense>
  );
}