"use client";

import { CourseListPage } from "@/components/courses/course-list-page";

export default function AdminCoursesPage() {
  return (
    <CourseListPage basePath="admin" displayMode="list" showEditButton={true} />
  );
}
