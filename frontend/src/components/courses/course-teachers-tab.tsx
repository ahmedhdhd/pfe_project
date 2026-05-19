"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Edit, Trash2 } from "lucide-react";
import { decodeHtmlEntities } from "@/lib/utils";
import { Teacher } from "./types";

interface CourseTeachersTabProps {
  teachers: Teacher[];
  isLoading: boolean;
  canManageCourse: boolean;
  onAssignTeachers: () => void;
  onCreateTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacher: Teacher) => void;
}

export function CourseTeachersTab({
  teachers,
  isLoading,
  canManageCourse,
  onAssignTeachers,
  onCreateTeacher,
  onEditTeacher,
  onDeleteTeacher,
}: CourseTeachersTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Teachers</CardTitle>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onAssignTeachers}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Teacher
          </Button>
          {canManageCourse && (
            <Button onClick={onCreateTeacher}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Teacher
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading teachers...</div>
        ) : teachers && teachers.length > 0 ? (
          <div className="space-y-4">
            {teachers.map((teacher: Teacher) => (
              <Card key={teacher.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarImage
                          src={teacher.imageUrl}
                          alt={teacher.name}
                        />
                        <AvatarFallback className="text-sm">
                          {teacher.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{teacher.name}</h4>
                        {(() => {
                          const highlightsContent =
                            typeof teacher.highlights === "string"
                              ? teacher.highlights
                              : teacher.highlights?.content || "";
                          const decodedContent = highlightsContent
                            ? decodeHtmlEntities(highlightsContent)
                            : "";
                          return decodedContent ? (
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground course-description [&_p]:m-0 [&_p]:mb-2 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-2 [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2 [&_li]:mb-1 [&_li]:text-sm [&_strong]:font-semibold [&_em]:italic"
                              dangerouslySetInnerHTML={{
                                __html: decodedContent,
                              }}
                            />
                          ) : null;
                        })()}
                      </div>
                    </div>
                    {canManageCourse && (
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditTeacher(teacher)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeleteTeacher(teacher)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No teachers assigned yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
