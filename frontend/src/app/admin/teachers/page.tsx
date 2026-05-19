"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  Grid3x3,
  List,
  Users,
  BookOpen,
  GraduationCap,
  Star,
} from "lucide-react";
import { useGetAllTeachers, useDeleteTeacher, useCurrentUser } from "@/hooks";
import { EditTeacherModal } from "@/components/common/edit-teacher-modal";
import { InviteUserModal } from "@/components/common/invite-user-modal";
import { PremiumTeacherCard } from "@/components/teachers/premium-teacher-card";
import { PremiumStatsCard } from "@/components/teachers/premium-stats-card";
import { TeacherQuickView } from "@/components/teachers/teacher-quick-view";

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

export default function AdminTeachersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTeacher, setSelectedTeacher] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTeacherForView, setSelectedTeacherForView] =
    useState<Teacher | null>(null);
  const [selectedTeacherForEdit, setSelectedTeacherForEdit] =
    useState<Teacher | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data: teachersResponse, isLoading } = useGetAllTeachers();
  const deleteTeacherMutation = useDeleteTeacher();
  const { data: currentUser } = useCurrentUser();

  const teachers = (teachersResponse?.data || []) as Teacher[];

  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subjects?.some((subject: string) =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesSubject =
      subjectFilter === "all" || teacher.subjects?.includes(subjectFilter);
    return matchesSearch && matchesSubject;
  });

  const handleEditTeacher = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      setSelectedTeacherForEdit(teacher);
      setIsEditModalOpen(true);
    }
  };

  const handleViewTeacher = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    if (teacher) {
      setSelectedTeacherForView(teacher);
      setIsQuickViewOpen(true);
    }
  };

  const handleTeacherUpdated = () => {
    setIsEditModalOpen(false);
    setSelectedTeacherForEdit(null);
  };

  const handleDeleteTeacher = (teacher: { id: string; name: string }) => {
    setSelectedTeacher(teacher);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTeacher) {
      deleteTeacherMutation.mutate(selectedTeacher.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedTeacher(null);
        },
      });
    }
  };

  const allSubjects = Array.from(
    new Set(teachers.flatMap((teacher) => teacher.subjects || []))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading teachers...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Teachers"
        description="Manage teachers and their batch assignments"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Teachers" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsInviteModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Invite Teacher
            </Button>
          </div>
        }
        className="mb-6"
      />

      {/* Premium Stats Cards - Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <PremiumStatsCard
          title="Teachers"
          value={teachers.length}
          icon={GraduationCap}
          gradient="blue"
        />
        <PremiumStatsCard
          title="Avg Rating"
          value={
            teachers.length > 0
              ? (
                  teachers.reduce(
                    (sum, teacher) => sum + (teacher.rating || 0),
                    0
                  ) / teachers.length
                ).toFixed(1)
              : "0.0"
          }
          icon={Star}
          gradient="orange"
        />
        <PremiumStatsCard
          title="Total Batches"
          value={teachers.reduce(
            (sum, teacher) => sum + (teacher.batchIds?.length || 0),
            0
          )}
          icon={BookOpen}
          gradient="purple"
        />
      </div>

      {/* Enhanced Filters */}
      <Card className="border shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
              <Input
                placeholder="Search teachers by name or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            {/* Subject Filter */}
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <Filter className="mr-2 h-4 w-4 shrink-0" />
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex gap-2 shrink-0">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-10 px-3"
              >
                <Grid3x3 className="h-4 w-4 mr-1.5" />
                Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-10 px-3"
              >
                <List className="h-4 w-4 mr-1.5" />
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Grid/List */}
      {filteredTeachers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GraduationCap className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teachers found</h3>
            <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
              {searchQuery || subjectFilter !== "all"
                ? "Try adjusting your search or filters to find teachers."
                : "Get started by inviting your first teacher to the platform."}
            </p>
            {!searchQuery && subjectFilter === "all" && (
              <Button onClick={() => setIsInviteModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Invite Teacher
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
              : "space-y-3"
          }
        >
          {filteredTeachers.map((teacher) => (
            <PremiumTeacherCard
              key={teacher.id}
              teacher={teacher}
              onView={handleViewTeacher}
              onEdit={handleEditTeacher}
              onDelete={handleDeleteTeacher}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Teacher</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedTeacher?.name}
              &quot;? This action cannot be undone. The teacher will be removed
              from all assigned batches.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete Teacher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick View Panel */}
      <TeacherQuickView
        teacher={selectedTeacherForView}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setSelectedTeacherForView(null);
        }}
        onEdit={(teacherId: string) => {
          setIsQuickViewOpen(false);
          handleEditTeacher(teacherId);
        }}
      />

      {/* Edit Teacher Modal */}
      {selectedTeacherForEdit && (
        <EditTeacherModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTeacherForEdit(null);
          }}
          teacher={{
            id: selectedTeacherForEdit.id,
            name: selectedTeacherForEdit.name,
            imageUrl: selectedTeacherForEdit.imageUrl,
            subjects: selectedTeacherForEdit.subjects || [],
            highlights:
              typeof selectedTeacherForEdit.highlights === "string"
                ? selectedTeacherForEdit.highlights
                : JSON.stringify(selectedTeacherForEdit.highlights || {}),
            batchIds: selectedTeacherForEdit.batchIds || [],
            createdAt: selectedTeacherForEdit.createdAt,
            updatedAt: selectedTeacherForEdit.updatedAt,
          }}
          onSuccess={handleTeacherUpdated}
        />
      )}

      {/* Invite User Modal */}
      {currentUser?.organizationId && (
        <InviteUserModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          organizationId={currentUser.organizationId}
          defaultRole="TEACHER"
          allowedRoles={["TEACHER"]}
        />
      )}
    </div>
  );
}
