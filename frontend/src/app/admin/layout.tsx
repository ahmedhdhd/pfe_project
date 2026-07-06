"use client";

import { usePathname } from "next/navigation";
import { AdminTeacherLayout } from "@/components/common/admin-teacher-layout";
import { RouteGuard } from "@/components/common/route-guard";
import { ROLES } from "@/lib/constants";

const PUBLIC_ADMIN_PATHS = ["/admin/forgot-password", "/admin/reset-password"];

// Pages teachers cannot access: org settings/config and user/teacher/order management
const ADMIN_ONLY_PATHS = [
  "/admin/settings",
  "/admin/organization-config",
  "/admin/users",
  "/admin/teachers",
  "/admin/orders",
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_ADMIN_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  if (isPublicPath) {
    return <>{children}</>;
  }

  const isAdminOnlyPath = ADMIN_ONLY_PATHS.some((path) =>
    pathname.startsWith(path)
  );
  const allowedRoles = isAdminOnlyPath
    ? [ROLES.ADMIN]
    : [ROLES.ADMIN, ROLES.TEACHER];

  return (
    <RouteGuard allowedRoles={allowedRoles}>
      <AdminTeacherLayout>{children}</AdminTeacherLayout>
    </RouteGuard>
  );
}
