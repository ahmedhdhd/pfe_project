"use client";

import { AdminTeacherLayout } from "@/components/common/admin-teacher-layout";
import { RouteGuard } from "@/components/common/route-guard";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={["teacher", "admin"]}>
      <AdminTeacherLayout>{children}</AdminTeacherLayout>
    </RouteGuard>
  );
}
