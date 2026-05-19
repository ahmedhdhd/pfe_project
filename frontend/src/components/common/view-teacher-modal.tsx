"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Star, Clock, GraduationCap, Award } from "lucide-react";
import { decodeHtmlEntities } from "@/lib/utils";

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
  batchIds?: string[];
  batches?: Array<{ id: string; name: string }>;
  rating?: number;
  students?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ViewTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  onEdit?: (teacherId: string) => void;
}

export function ViewTeacherModal({
  isOpen,
  onClose,
  teacher,
  onEdit,
}: ViewTeacherModalProps) {
  if (!teacher) return null;

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{teacher.name}</DialogTitle>
            {onEdit && (
              <Button variant="outline" onClick={() => onEdit(teacher.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start space-x-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={teacher.imageUrl} alt={teacher.name} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(teacher.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{teacher.name}</h3>
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-1">
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                      <span className="text-lg font-medium">
                        {teacher.rating || "N/A"}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {teacher.students?.toLocaleString() || 0} students
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subjects */}
          {teacher.subjects && teacher.subjects.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3">Subjects</h4>
                <div className="flex flex-wrap gap-2">
                  {teacher.subjects.map((subject: string) => (
                    <Badge
                      key={subject}
                      variant="secondary"
                      className="text-sm"
                    >
                      {subject}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Highlights */}
          {(teacher.highlights?.experience ||
            teacher.highlights?.education ||
            teacher.highlights?.achievements) && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3">Highlights</h4>
                <div className="space-y-3">
                  {teacher.highlights.experience && (
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Experience</p>
                        <p className="text-sm text-muted-foreground">
                          {teacher.highlights.experience}
                        </p>
                      </div>
                    </div>
                  )}
                  {teacher.highlights.education && (
                    <div className="flex items-center space-x-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Education</p>
                        <p className="text-sm text-muted-foreground">
                          {teacher.highlights.education}
                        </p>
                      </div>
                    </div>
                  )}
                  {teacher.highlights.achievements &&
                    teacher.highlights.achievements.length > 0 && (
                      <div className="flex items-start space-x-3">
                        <Award className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Achievements</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground">
                            {teacher.highlights.achievements.map(
                              (achievement: string, idx: number) => (
                                <li key={idx}>{achievement}</li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  {teacher.highlights.content && (
                    <div>
                      <p className="text-sm font-medium mb-2">About</p>
                      <div
                        className="prose prose-sm max-w-none text-muted-foreground [&_p]:m-0 [&_p]:mb-2 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-2 [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_li]:text-sm [&_strong]:font-semibold [&_em]:italic"
                        dangerouslySetInnerHTML={{
                          __html: decodeHtmlEntities(
                            teacher.highlights.content
                          ),
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned Batches */}
          {teacher.batches && teacher.batches.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3">Assigned Batches</h4>
                <div className="space-y-2">
                  {teacher.batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm font-medium">{batch.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <div className="text-sm text-muted-foreground border-t pt-4">
            <div className="flex justify-between">
              {teacher.createdAt && (
                <span>Added: {formatDate(teacher.createdAt)}</span>
              )}
              {teacher.updatedAt && (
                <span>Updated: {formatDate(teacher.updatedAt)}</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
