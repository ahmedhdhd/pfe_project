"use client";

import { usePathname } from "next/navigation";
import { AdminTeacherLayout } from "@/components/common/admin-teacher-layout";
import { RouteGuard } from "@/components/common/route-guard";
import { ROLES } from "@/lib/constants";

const PUBLIC_ADMIN_PATHS = ["/admin/forgot-password", "/admin/reset-password"];

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

  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN]}>
      <AdminTeacherLayout>{children}</AdminTeacherLayout>
    </RouteGuard>
  );
}
