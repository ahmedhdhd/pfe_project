"use client";

import { CourseDetailPage } from "@/components/courses/course-detail-page";

export default function AdminCourseDetailPage() {
  return (
    <CourseDetailPage
      basePath="admin"
      showSubjectsTab={true}
      showAnalyticsTab={true}
      showSettingsTab={true}
    />
  );
}
