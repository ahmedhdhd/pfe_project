"use client";

import { CourseDetailPage } from "@/components/courses/course-detail-page";

export default function TeacherCourseDetailPage() {
  return (
    <CourseDetailPage
      basePath="teacher"
      showSubjectsTab={true}
      showAnalyticsTab={true}
      showSettingsTab={false}
    />
  );
}
