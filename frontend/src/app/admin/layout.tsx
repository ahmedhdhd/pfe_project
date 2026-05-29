"use client";

import { AdminTeacherLayout } from "@/components/common/admin-teacher-layout";
import { RouteGuard } from "@/components/common/route-guard";
import { AdminOnboardingGuard } from "@/components/admin/AdminOnboardingGuard";
import { ROLES } from "@/lib/constants";
import { usePathname } from "next/navigation";

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
        <AdminOnboardingGuard>{children}</AdminOnboardingGuard>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN]}>
      <AdminOnboardingGuard>
        <AdminTeacherLayout>{children}</AdminTeacherLayout>
      </AdminOnboardingGuard>
    </RouteGuard>
  );
}
