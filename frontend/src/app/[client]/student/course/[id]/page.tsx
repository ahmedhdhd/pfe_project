"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useCourses } from "@/hooks";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  CourseContent,
  Course,
  Subject,
  Chapter,
} from "@/components/student/course";
import {
  ContentViewer,
  ChapterList,
  CourseSidebar,
  CoursePlayerTabs,
  calculateCourseProgress,
} from "@/components/student/course";

export default function StudentCourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: coursesData, isLoading, error } = useCourses();

  interface CoursesResponse {
    courses?: Course[];
    [key: string]: unknown;
  }

  const courseData = useMemo(() => {
    const courses = (coursesData as CoursesResponse | undefined)?.courses;
    return courses?.find((c: Course) => c.id === courseId);
  }, [coursesData, courseId]);

  // Extract all chapters from all subjects
  const allChapters = useMemo(() => {
    if (!courseData?.subjects || !Array.isArray(courseData.subjects)) {
      return [];
    }
    return (courseData.subjects as Subject[]).flatMap(
      (subject) => subject.chapters || []
    );
  }, [courseData]);

  // Calculate progress
  const progress = useMemo(
    () => calculateCourseProgress(courseData?.subjects),
    [courseData?.subjects]
  );

  if (isLoading) {
    return <LoadingSpinner text="Loading course details..." />;
  }

  if (error || !courseData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load course details.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <PageHeader
          title={(courseData.title as string) || "Course Details"}
          description=""
        />
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Menu className="w-4 h-4" />
              Course Hierarchy
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader className="mb-6">
              <SheetTitle>Course Hierarchy</SheetTitle>
            </SheetHeader>
            <CourseSidebar course={courseData} progress={progress} />
            <div className="mt-8">
              <h3 className="font-semibold mb-4 text-lg">Course Content</h3>
              <ChapterList
                chapters={allChapters}
                onContentSelect={(content) => {
                  setSelectedContent(content);
                  setIsSidebarOpen(false); // Close sidebar on selection
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="w-full">
        {/* Course Content Viewer (Video) */}
        {selectedContent ? (
          <ContentViewer
            content={selectedContent}
            onBack={() => setSelectedContent(null)}
          />
        ) : (
          <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-xl border border-dashed">
            <div className="text-center p-8">
              <h3 className="text-xl font-medium mb-2">Welcome to {courseData.title}</h3>
              <p className="text-muted-foreground mb-4">Select a lesson from the course hierarchy to begin learning.</p>
              <Button onClick={() => setIsSidebarOpen(true)}>Browse Curriculum</Button>
            </div>
          </div>
        )}
      </div>

      <CoursePlayerTabs 
        course={courseData} 
        courseId={courseId} 
        chapters={allChapters} 
        onContentSelect={setSelectedContent} 
      />
    </div>
  );
}
