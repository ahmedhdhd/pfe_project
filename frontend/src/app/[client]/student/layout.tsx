"use client";

import { StudentLayout } from "@/components/common/student-layout";
import { RouteGuard } from "@/components/common/route-guard";

export default function StudentLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={["student", "admin", "teacher"]}>
      <StudentLayout>{children}</StudentLayout>
    </RouteGuard>
  );
}
