"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/common/page-header";
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
  Edit,
  Trash2,
  BookOpen,
  Eye,
  Users,
  Calendar,
  Globe,
} from "@/components/icons";
import { useGetAllBatches, useDeleteBatch } from "@/hooks";
import { CreateBatchModal } from "@/components/admin/create-batch-modal";
import { EditBatchModal } from "@/components/admin/edit-batch-modal";
import { useRolePermissions } from "@/hooks/common";
import { useOrgCurrency, useOrgPaymentMode } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { BatchDataTable } from "./batch-data-table";

interface Batch {
  id: string;
  name: string;
  description: string;
  class?: string;
  exam?: string;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  language: string;
  totalPrice: number;
  discountPercentage: number;
  status: "ACTIVE" | "INACTIVE";
  faq: Array<{
    title: string;
    description: string;
  }>;
  teacherId: string;
  teacher?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface CourseListPageProps {
  basePath: "admin" | "teacher";
  title?: string;
  subtitle?: string;
  showEditButton?: boolean;
  displayMode?: "list" | "grid";
  headerTitle?: string;
}

export function CourseListPage({
  basePath,
  title,
  subtitle,
  showEditButton = true,
  displayMode = "list",
  headerTitle,
}: CourseListPageProps) {
  const router = useRouter();
  const [selectedBatch, setSelectedBatch] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBatchForEdit, setSelectedBatchForEdit] =
    useState<Batch | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const queryClient = useQueryClient();
  const { data: batches, isLoading } = useGetAllBatches();
  const deleteBatchMutation = useDeleteBatch();
  const { isAdmin, isTeacher, canDeleteCourses } = useRolePermissions();
  const paymentMode = useOrgPaymentMode();
  const currency = useOrgCurrency();
  const showCoursePricing = paymentMode === "per_course";

  // Allow both admin and teacher to manage courses
  const canManageCourse = isAdmin || isTeacher;

  // Default titles based on basePath
  const defaultTitle =
    title || (basePath === "admin" ? "All Courses" : "My Courses");
  const defaultSubtitle =
    subtitle ||
    (basePath === "admin"
      ? "Manage your courses and batch assignments"
      : "Manage your courses and teaching assignments");

  const filteredBatches = (batches?.data || []).filter((batch: Batch) => {
    const matchesSearch =
      batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.exam || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.class || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.category?.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const now = new Date();
    const startDate = new Date(batch.startDate);
    const endDate = new Date(batch.endDate);

    let matchesStatus = true;
    if (statusFilter === "upcoming") {
      matchesStatus = startDate > now;
    } else if (statusFilter === "ongoing") {
      matchesStatus = startDate <= now && endDate >= now;
    } else if (statusFilter === "completed") {
      matchesStatus = endDate < now;
    }

    return matchesSearch && matchesStatus;
  });

  const handleCreateCourse = () => {
    setIsCreateModalOpen(true);
  };

  const handleViewCourse = (batchId: string) => {
    router.push(`/${basePath}/courses/${batchId}`);
  };

  const handleEditCourse = (batchId: string) => {
    if (!canManageCourse) return;
    const batch = batches?.data?.find((b: Batch) => b.id === batchId);
    if (batch) {
      setSelectedBatchForEdit(batch);
      setIsEditModalOpen(true);
    }
  };

  const handleBatchUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["batches"] });
  };

  const handleDeleteCourse = (batch: { id: string; name: string }) => {
    if (canManageCourse) {
      setSelectedBatch(batch);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (selectedBatch) {
      deleteBatchMutation.mutate(selectedBatch.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedBatch(null);
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    return formatCurrency(price, currency);
  };

  const calculateDiscountedPrice = (
    totalPrice: number,
    discountPercentage: number
  ) => {
    return totalPrice - (totalPrice * discountPercentage) / 100;
  };

  const getStatusBadge = (batch: Batch) => {
    const now = new Date();
    const startDate = new Date(batch.startDate);
    const endDate = new Date(batch.endDate);

    if (startDate > now) {
      return <Badge variant="secondary">Upcoming</Badge>;
    } else if (startDate <= now && endDate >= now) {
      return <Badge variant="default">Ongoing</Badge>;
    } else {
      return <Badge variant="outline">Completed</Badge>;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading courses...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={headerTitle || defaultTitle}
        description={defaultSubtitle}
        breadcrumbs={[
          {
            label: basePath === "admin" ? "Admin" : "Teacher",
            href: `/${basePath}/dashboard`,
          },
          { label: "Courses" },
        ]}
        actions={
          <Button onClick={handleCreateCourse} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Create Course
          </Button>
        }
        className="mb-6"
      />

      {displayMode === "list" ? (
        <BatchDataTable
          batches={batches?.data || []}
          basePath={basePath}
          onEdit={handleEditCourse}
          onDelete={handleDeleteCourse}
          canManageCourse={canManageCourse}
          canPublishCourse={isAdmin}
          showEditButton={showEditButton}
        />
      ) : (
        // Grid View (Teacher Style)
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBatches.map((batch: Batch) => (
            <Card
              key={batch.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative">
                <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 relative">
                  {batch.imageUrl ? (
                    <Image
                      src={batch.imageUrl}
                      alt={batch.name}
                      className="w-full h-full object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-16 w-16 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(batch)}
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                        {batch.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {batch.category?.name && (
                          <Badge variant="secondary">{batch.category.name}</Badge>
                        )}
                        {batch.class && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>Class {batch.class}</span>
                          </div>
                        )}
                        {batch.exam && (
                          <div className="flex items-center space-x-1">
                            <BookOpen className="h-4 w-4" />
                            <span>{batch.exam}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {batch.teacher && (
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={batch.teacher.imageUrl}
                            alt={batch.teacher.name}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(batch.teacher.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {batch.teacher.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Instructor
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Starts: {formatDate(batch.startDate)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Ends: {formatDate(batch.endDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{batch.language}</span>
                    </div>

                    {showCoursePricing && (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(
                            calculateDiscountedPrice(
                              batch.totalPrice,
                              batch.discountPercentage
                            )
                          )}
                        </p>
                        {batch.discountPercentage > 0 && (
                          <p className="text-sm text-muted-foreground line-through">
                            {formatPrice(batch.totalPrice)}
                          </p>
                        )}
                      </div>
                      {batch.discountPercentage > 0 && (
                        <Badge variant="destructive">
                          {batch.discountPercentage}% OFF
                        </Badge>
                      )}
                    </div>
                    )}

                    <div className="flex space-x-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCourse(batch.id)}
                        className="flex-1"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                      {canManageCourse && showEditButton && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCourse(batch.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canManageCourse && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCourse(batch)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredBatches.length === 0 && displayMode === "grid" && (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search criteria or filters"
                : "Get started by creating your first course"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={handleCreateCourse}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Course
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedBatch?.name}
              &quot;? This action cannot be undone. All associated data
              including student enrollments will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBatchMutation.isPending}
            >
              {deleteBatchMutation.isPending ? "Deleting..." : "Delete Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Batch Modal */}
      <CreateBatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ["batches"] });
        }}
      />

      {/* Edit Batch Modal - admins and teachers (publishing stays admin-only) */}
      {canManageCourse && (
        <EditBatchModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedBatchForEdit(null);
          }}
          batch={selectedBatchForEdit}
          onSuccess={handleBatchUpdated}
        />
      )}
    </div>
  );
}
