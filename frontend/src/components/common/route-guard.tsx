"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRequireAuth, useRequireRole } from "@/hooks";
import { UserRole } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  fallback?: ReactNode;
}

export function RouteGuard({
  children,
  allowedRoles = ["admin", "teacher", "student"],
  fallback,
}: RouteGuardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const {
    hasRequiredRole,
    isLoading: roleLoading,
    user,
  } = useRequireRole(allowedRoles[0] as "ADMIN" | "TEACHER" | "STUDENT");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasRequiredRole) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page.
              <br />
              Your current role:{" "}
              <strong>
                {user
                  ? (user as { role?: string }).role || "Unknown"
                  : "Not authenticated"}
              </strong>
              <br />
              Required roles: {allowedRoles.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex space-x-2">
              <Button variant="outline" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Home
                </Link>
              </Button>
              <Button asChild>
                <Link href="/login">Switch Account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
