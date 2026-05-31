"use client";

import { AdminTeacherLayout } from "@/components/common/admin-teacher-layout";
import { RouteGuard } from "@/components/common/route-guard";
import { AdminOnboardingGuard } from "@/components/admin/AdminOnboardingGuard";
import { AdminOrgConfigSync } from "@/components/theme/AdminOrgConfigSync";
import { ThemeEngineProvider } from "@/components/theme/ThemeEngineProvider";
import { ROLES } from "@/lib/constants";
import { usePathname } from "next/navigation";

function AdminThemeShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeEngineProvider>
      <AdminOrgConfigSync />
      {children}
    </ThemeEngineProvider>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/admin/onboarding");

  if (isOnboarding) {
    return (
      <RouteGuard allowedRoles={[ROLES.ADMIN]}>
        <AdminOnboardingGuard>
          <AdminThemeShell>{children}</AdminThemeShell>
        </AdminOnboardingGuard>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN]}>
      <AdminOnboardingGuard>
        <AdminThemeShell>
          <AdminTeacherLayout>{children}</AdminTeacherLayout>
        </AdminThemeShell>
      </AdminOnboardingGuard>
    </RouteGuard>
  );
}
