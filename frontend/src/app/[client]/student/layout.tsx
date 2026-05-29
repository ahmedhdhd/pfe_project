"use client";

import { StudentLayout } from "@/components/common/student-layout";
import { RouteGuard } from "@/components/common/route-guard";
import { StudentFeatureGuard } from "@/components/student/StudentFeatureGuard";

export default function StudentLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={["student", "admin", "teacher"]}>
      <StudentFeatureGuard>
        <StudentLayout>{children}</StudentLayout>
      </StudentFeatureGuard>
    </RouteGuard>
  );
}
