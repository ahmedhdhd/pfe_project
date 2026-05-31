"use client";

import { ReactNode } from "react";
import { MobileBottomTabs } from "@/components/common/mobile-bottom-tabs";
import { useRequireAuth } from "@/hooks";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { StudentSidebarNav } from "@/components/student/student-sidebar-nav";

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const { isAuthenticated, isLoading } = useRequireAuth();
  const pathname = usePathname();
  const isAttemptRoute = Boolean(
    pathname?.includes("/student/tests/") && pathname?.endsWith("/attempt")
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="student-layout relative flex flex-col min-h-screen bg-background">
      {/* Sidebar — only visible when data-ui-student-shell="sidebar" via CSS */}
      <aside className="student-sidebar hidden">
        <StudentSidebarNav />
      </aside>

      {/* Main content */}
      <main
        className={
          !isAttemptRoute
            ? "student-main relative z-0 flex-1 overflow-x-hidden bg-background"
            : "student-main flex-1 overflow-auto p-0"
        }
      >
        {children}
      </main>

      {/* Mobile bottom tabs */}
      {isAuthenticated && !isAttemptRoute && <MobileBottomTabs />}
    </div>
  );
}
