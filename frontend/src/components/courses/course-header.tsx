"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Calendar,
  Globe,
} from "lucide-react";
import { Batch } from "./types";

interface CourseHeaderProps {
  course: Batch;
  canManageCourse: boolean;
  basePath: string;
  onGoBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CourseHeader({
  course,
  canManageCourse,
  basePath,
  onGoBack,
  onEdit,
  onDelete,
}: CourseHeaderProps) {
  const getStatusBadge = (courseData: Batch) => {
    const now = new Date();
    const startDate = new Date(courseData.startDate);
    const endDate = new Date(courseData.endDate);

    if (now < startDate) {
      return <Badge className="bg-blue-500">Upcoming</Badge>;
    } else if (now > endDate) {
      return <Badge className="bg-gray-500">Completed</Badge>;
    } else {
      return <Badge className="bg-green-500">Active</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" onClick={onGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-4">
            <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
            {getStatusBadge(course)}
          </div>
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Class {course.class}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>{course.exam}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>{course.language}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(course.startDate)} - {formatDate(course.endDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          {canManageCourse && (
            <>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
