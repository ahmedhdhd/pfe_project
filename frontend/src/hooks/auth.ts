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
export const useRequireRole = (
  requiredRole: "ADMIN" | "TEACHER" | "STUDENT"
) => {
  const [isMounted, setIsMounted] = useState(false);
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    if (!isLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }

    if (
      !isLoading &&
      isAuthenticated &&
      user &&
      (user as { role?: string }).role?.toLowerCase() !==
        requiredRole.toLowerCase()
    ) {
      // Redirect to appropriate dashboard based on user role
      switch ((user as { role?: string }).role?.toLowerCase()) {
        case "admin":
          router.push("/admin/dashboard");
          break;
        case "teacher":
          router.push("/teacher/dashboard");
          break;
        case "student":
          router.push("/student/dashboard");
          break;
        default:
          router.push("/login");
      }
    }
  }, [isMounted, isLoading, isAuthenticated, user, requiredRole, router]);

  return {
    user,
    isLoading: !isMounted || isLoading,
    isAuthenticated: isMounted ? isAuthenticated : false,
    hasRequiredRole:
      isMounted &&
      user &&
      (user as { role?: string }).role?.toLowerCase() ===
        requiredRole.toLowerCase(),
  };
};

// Check if user is authenticated
export const useIsAuthenticated = () => {
  return tokenManager.isAuthenticated();
};
