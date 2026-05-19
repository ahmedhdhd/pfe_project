"use client";

import { AdminTeacherLayout } from "@/components/common/admin-teacher-layout";
import { RouteGuard } from "@/components/common/route-guard";
import { ROLES } from "@/lib/constants";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={[ROLES.ADMIN]}>
      <AdminTeacherLayout>{children}</AdminTeacherLayout>
    </RouteGuard>
  );
}
