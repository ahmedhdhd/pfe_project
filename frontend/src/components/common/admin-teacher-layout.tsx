"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/common/sidebar";
import { Header } from "@/components/common/header";
import { useRequireAuth } from "@/hooks";
import { Loader2 } from "@/components/icons";

interface AdminTeacherLayoutProps {
  children: ReactNode;
}

export function AdminTeacherLayout({ children }: AdminTeacherLayoutProps) {
  const { isAuthenticated, isLoading } = useRequireAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
