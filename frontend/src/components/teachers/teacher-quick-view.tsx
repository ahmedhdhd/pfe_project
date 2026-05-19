"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Star,
  Users,
  BookOpen,
  GraduationCap,
  Clock,
  Award,
  Mail,
  Edit,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TeacherQuickViewProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (teacherId: string) => void;
}

export function TeacherQuickView({
  teacher,
  isOpen,
  onClose,
  onEdit,
}: TeacherQuickViewProps) {
  if (!teacher) return null;

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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-2xl">Teacher Profile</SheetTitle>
          <SheetDescription>
            Complete information about {teacher.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
              <AvatarImage src={teacher.imageUrl} alt={teacher.name} />
              <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/10 text-primary font-bold text-2xl">
                {getInitials(teacher.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{teacher.name}</h2>
              {teacher.email && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{teacher.email}</span>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-lg">
                    {rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-5 w-5" />
                  <span>{students.toLocaleString()} students</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <BookOpen className="h-5 w-5" />
                  <span>{batches.length} batches</span>
                </div>
              </div>
            </div>
            <Button onClick={() => onEdit(teacher.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>

          <Separator />

          {/* Subjects */}
          {teacher.subjects && teacher.subjects.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((subject) => (
                  <Badge
                    key={subject}
                    variant="secondary"
                    className="text-sm px-3 py-1"
                  >
                    {subject}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Experience & Education */}
          {(teacher.highlights?.experience ||
            teacher.highlights?.education) && (
            <div>
              <h3 className="font-semibold mb-3">Background</h3>
              <div className="space-y-3">
                {teacher.highlights.experience && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-1">Experience</p>
                      <p className="text-sm text-muted-foreground">
                        {teacher.highlights.experience}
                      </p>
                    </div>
                  </div>
                )}
                {teacher.highlights.education && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <GraduationCap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm mb-1">Education</p>
                      <p className="text-sm text-muted-foreground">
                        {teacher.highlights.education}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Achievements */}
          {teacher.highlights?.achievements &&
            teacher.highlights.achievements.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Achievements</h3>
                <div className="space-y-2">
                  {teacher.highlights.achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Award className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm">{achievement}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Batches */}
          {batches.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">
                Assigned Batches ({batches.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{batch.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          {(teacher.createdAt || teacher.updatedAt) && (
            <div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                {teacher.createdAt && (
                  <div>
                    <p className="font-medium mb-1">Joined</p>
                    <p>
                      {new Date(teacher.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {teacher.updatedAt && (
                  <div>
                    <p className="font-medium mb-1">Last Updated</p>
                    <p>
                      {new Date(teacher.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
