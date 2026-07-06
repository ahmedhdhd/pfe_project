"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./api";
import { tokenManager } from "@/lib/api/client";

// Require Authentication Hook
export const useRequireAuth = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isMounted, isLoading, isAuthenticated, router]);

  return {
    user,
    isLoading: !isMounted || isLoading,
    isAuthenticated: isMounted ? isAuthenticated : false,
  };
};

// Require Role Hook
export const useRequireRole = (requiredRoles: string | string[]) => {
  const [isMounted, setIsMounted] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const allowedRoles = (
    Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  ).map((role) => role.toLowerCase());
  const userRole = (user as { role?: string } | null)?.role?.toLowerCase();
  const hasRequiredRole = Boolean(userRole && allowedRoles.includes(userRole));
  const allowedRolesKey = allowedRoles.join(",");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!isLoading && isAuthenticated && user && !hasRequiredRole) {
      // Redirect to appropriate dashboard based on user role
      switch (userRole) {
        case "admin":
        case "teacher":
          router.push("/admin/dashboard");
          break;
        case "student":
          router.push("/student/dashboard");
          break;
        default:
          router.push("/login");
      }
    }
  }, [
    isMounted,
    isLoading,
    isAuthenticated,
    user,
    userRole,
    hasRequiredRole,
    allowedRolesKey,
    router,
  ]);

  return {
    user,
    isLoading: !isMounted || isLoading,
    isAuthenticated: isMounted ? isAuthenticated : false,
    hasRequiredRole: isMounted && hasRequiredRole,
  };
};

// Check if user is authenticated
export const useIsAuthenticated = () => {
  return tokenManager.isAuthenticated();
};
