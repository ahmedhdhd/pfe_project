"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/common/sidebar";
import { Header } from "@/components/common/header";
import { useRequireAuth } from "@/hooks";
import { Loader2 } from "lucide-react";

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
        <main className="flex-1 overflow-auto p-6 pb-24 md:pb-6 bg-[radial-gradient(80rem_50rem_at_120%_-10%,theme(colors.primary/6),transparent_60%),radial-gradient(60rem_40rem_at_-10%_-20%,theme(colors.muted/40),transparent_50%)]">
          {children}
        </main>
      </div>
    </div>
  );
}
