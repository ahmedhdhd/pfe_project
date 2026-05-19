"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CourseProgress } from "./types";

interface CourseSidebarProps {
  course: {
    title?: string;
    description?: string;
  };
  progress?: CourseProgress;
}

export function CourseSidebar({ course, progress }: CourseSidebarProps) {
  const {
    overallProgress = 0,
    lessonsCount = 0,
    completedCount = 0,
  } = progress || {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Course Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} />
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lessons</span>
              <span>{lessonsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span>{completedCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About This Course</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {course.description || "No description available."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
