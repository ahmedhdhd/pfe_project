"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, X, Star, Users, Check } from "lucide-react";
import {
  useGetAllTeachers,
  useGetTeachersByBatch,
  useAssignTeacherToBatch,
  useRemoveTeacherFromBatch,
} from "@/hooks";

interface TeacherAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  batchName: string;
  onAssignmentChange?: () => void;
}

interface Teacher {
  id: string;
  name: string;
  imageUrl?: string;
  subjects?: string[];
  highlights?: {
    content?: string;
  };
  rating?: number;
  students?: number;
}

export function TeacherAssignmentModal({
  isOpen,
  onClose,
  batchId,
  batchName,
  onAssignmentChange,
}: TeacherAssignmentModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState<string[]>([]);

  const { data: allTeachersResponse, isLoading: isLoadingAllTeachers } =
    useGetAllTeachers();
  const { data: batchTeachers, isLoading: isLoadingBatchTeachers } =
    useGetTeachersByBatch(batchId);
  const assignTeacherMutation = useAssignTeacherToBatch();
  const removeTeacherMutation = useRemoveTeacherFromBatch();

  const isLoading = isLoadingAllTeachers || isLoadingBatchTeachers;

  const allTeachers = (allTeachersResponse?.data || []) as Teacher[];
  const assignedTeachers = (batchTeachers?.data || []) as Teacher[];

  useEffect(() => {
    if (assignedTeachers.length > 0) {
      setAssignedTeacherIds(
        assignedTeachers.map((teacher: Teacher) => teacher.id)
      );
    }
  }, [assignedTeachers]);

  const filteredTeachers = allTeachers.filter((teacher) => {
    const matchesSearch =
      teacher.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subjects?.some((subject: string) =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesSearch;
  });

  const handleTeacherSelect = (teacherId: string) => {
    if (selectedTeachers.includes(teacherId)) {
      setSelectedTeachers((prev) => prev.filter((id) => id !== teacherId));
    } else {
      setSelectedTeachers((prev) => [...prev, teacherId]);
    }
  };

  const handleAssignTeachers = async () => {
    try {
      for (const teacherId of selectedTeachers) {
        if (!assignedTeacherIds.includes(teacherId)) {
          await assignTeacherMutation.mutateAsync({
            teacherId,
            batchId,
          });
        }
      }
      setSelectedTeachers([]);
      onAssignmentChange?.();
    } catch (error) {
      console.error("Failed to assign teachers:", error);
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    try {
      await removeTeacherMutation.mutateAsync({
        teacherId,
        batchId,
      });
      onAssignmentChange?.();
    } catch (error) {
      console.error("Failed to remove teacher:", error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const isTeacherAssigned = (teacherId: string) => {
    return assignedTeacherIds.includes(teacherId);
  };

  const isTeacherSelected = (teacherId: string) => {
    return selectedTeachers.includes(teacherId);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assign Teachers to {batchName}</DialogTitle>
            <DialogDescription>
              Select teachers to assign to this batch
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading teachers...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="shrink-0">
          <DialogTitle>Assign Teachers to {batchName}</DialogTitle>
          <DialogDescription>
            Select teachers to assign to this batch. You can assign multiple
            teachers at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 overflow-hidden flex-1 min-h-0">
          {/* Search */}
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search teachers by name or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Teachers Table */}
          <div className="border rounded-lg overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">Avatar</TableHead>
                    <TableHead className="min-w-[200px] max-w-[250px]">
                      Teacher
                    </TableHead>
                    <TableHead className="min-w-[200px]">Subjects</TableHead>
                    <TableHead className="w-[100px]">Rating</TableHead>
                    <TableHead className="w-[110px]">Students</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                        <p className="font-medium text-sm mb-1">
                          {searchQuery
                            ? "No teachers found matching your search"
                            : allTeachers.length === 0
                            ? "No teachers available"
                            : "All teachers are already assigned"}
                        </p>
                        {searchQuery && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Try adjusting your search terms
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      const isAssigned = isTeacherAssigned(teacher.id);
                      const isSelected = isTeacherSelected(teacher.id);

                      return (
                        <TableRow
                          key={teacher.id}
                          className={`${
                            isSelected
                              ? "bg-primary/10 hover:bg-primary/15"
                              : isAssigned
                              ? "opacity-60"
                              : "hover:bg-muted/50 cursor-pointer"
                          }`}
                          onClick={() =>
                            !isAssigned && handleTeacherSelect(teacher.id)
                          }
                        >
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <Avatar className="h-10 w-10">
                                <AvatarImage
                                  src={teacher.imageUrl}
                                  alt={teacher.name}
                                />
                                <AvatarFallback className="text-xs font-medium">
                                  {getInitials(teacher.name)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">
                                {teacher.name}
                              </span>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary shrink-0" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {teacher.subjects && teacher.subjects.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects
                                  .slice(0, 2)
                                  .map((subject: string) => (
                                    <Badge
                                      key={subject}
                                      variant="outline"
                                      className="text-xs py-0"
                                    >
                                      {subject}
                                    </Badge>
                                  ))}
                                {teacher.subjects.length > 2 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs py-0"
                                  >
                                    +{teacher.subjects.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No subjects
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {teacher.rating ? (
                              <div className="flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                                <span className="text-sm font-medium">
                                  {teacher.rating}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {teacher.students ? (
                              <span className="text-sm">
                                {teacher.students.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAssigned ? (
                              <Badge
                                variant="default"
                                className="bg-green-600 text-white"
                              >
                                Assigned
                              </Badge>
                            ) : (
                              <Badge variant="outline">Available</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAssigned ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveTeacher(teacher.id);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                disabled={removeTeacherMutation.isPending}
                                title="Remove teacher"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="w-8"></div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Selection Summary */}
          {selectedTeachers.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {selectedTeachers.length} teacher(s) selected
                  </span>
                </div>
                <Button
                  onClick={handleAssignTeachers}
                  disabled={assignTeacherMutation.isPending}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {assignTeacherMutation.isPending
                    ? "Assigning..."
                    : "Assign Teachers"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
