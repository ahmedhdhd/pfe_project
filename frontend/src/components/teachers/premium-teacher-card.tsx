"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Star,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Teacher {
  id: string;
  name: string;
  imageUrl?: string;
  subjects?: string[];
  highlights?: {
    experience?: string;
    education?: string;
    achievements?: string[];
    content?: string;
  };
  batches?: Array<{ id: string; name: string }>;
  rating?: number;
  students?: number;
}

interface PremiumTeacherCardProps {
  teacher: Teacher;
  onView: (teacherId: string) => void;
  onEdit: (teacherId: string) => void;
  onDelete: (teacher: Teacher) => void;
  viewMode?: "grid" | "list";
}

export function PremiumTeacherCard({
  teacher,
  onView,
  onEdit,
  onDelete,
  viewMode = "grid",
}: PremiumTeacherCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const rating = teacher.rating || 0;
  const students = teacher.students || 0;
  const batches = teacher.batches || [];
  const batchCount = batches.length;

  if (viewMode === "list") {
    return (
      <div className="group relative bg-card border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 shrink-0 ring-2 ring-background">
            <AvatarImage src={teacher.imageUrl} alt={teacher.name} />
            <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
              {getInitials(teacher.name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base mb-1 truncate">
                  {teacher.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{students.toLocaleString()} students</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{batchCount} batches</span>
                  </div>
                </div>
              </div>

              {/* Subjects */}
              {teacher.subjects && teacher.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {teacher.subjects.slice(0, 3).map((subject) => (
                    <Badge
                      key={subject}
                      variant="secondary"
                      className="text-xs font-medium"
                    >
                      {subject}
                    </Badge>
                  ))}
                  {teacher.subjects.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{teacher.subjects.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(teacher.id)}
                  className="h-8"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(teacher.id)}
                  className="h-8"
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onView(teacher.id)}
                      className="cursor-pointer"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onEdit(teacher.id)}
                      className="cursor-pointer"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Teacher
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(teacher)}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div className="group relative bg-card border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Gradient Background Effect */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Avatar with Status */}
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16 ring-2 ring-background shadow-md">
                <AvatarImage src={teacher.imageUrl} alt={teacher.name} />
                <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xl">
                  {getInitials(teacher.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>

            {/* Name and Quick Stats */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-2 truncate group-hover:text-primary transition-colors">
                {teacher.name}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{students.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{batchCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onView(teacher.id)}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(teacher.id)}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Teacher
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(teacher)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Subjects */}
        {teacher.subjects && teacher.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {teacher.subjects.slice(0, 4).map((subject, index) => (
              <Badge
                key={subject}
                variant="secondary"
                className={cn(
                  "text-xs font-medium px-2 py-0.5",
                  index === 0 &&
                    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                  index === 1 &&
                    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                  index === 2 &&
                    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                )}
              >
                {subject}
              </Badge>
            ))}
            {teacher.subjects.length > 4 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                +{teacher.subjects.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Experience & Education */}
        {(teacher.highlights?.experience || teacher.highlights?.education) && (
          <div className="space-y-2 mb-4">
            {teacher.highlights.experience && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {teacher.highlights.experience}
                </span>
              </div>
            )}
            {teacher.highlights.education && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{teacher.highlights.education}</span>
              </div>
            )}
          </div>
        )}

        {/* Batches Preview */}
        {batches.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Teaching {batchCount} {batchCount === 1 ? "Batch" : "Batches"}
              </p>
              {batches.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => onView(teacher.id)}
                >
                  View All
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {batches.slice(0, 2).map((batch) => (
                <Badge
                  key={batch.id}
                  variant="outline"
                  className="text-xs px-2 py-0.5 font-medium"
                >
                  {batch.name}
                </Badge>
              ))}
              {batches.length > 2 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{batches.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onView(teacher.id)}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onEdit(teacher.id)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
