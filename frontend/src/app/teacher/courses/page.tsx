"use client";

import { CourseListPage } from "@/components/courses/course-list-page";

export default function TeacherCoursesPage() {
  return (
    <CourseListPage
      basePath="teacher"
      displayMode="list"
      showEditButton={true}
    />
  );
}
