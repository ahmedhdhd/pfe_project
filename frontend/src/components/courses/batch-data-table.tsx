"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { queryKeys } from "@/hooks/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  Eye,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  Power,
  PowerOff,
} from "lucide-react";
import { useOrganizationConfigAdmin } from "@/hooks/api";
import { formatCurrency } from "@/lib/utils/format";
import { formatCategoryLabel } from "@/lib/categories";

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
  status?: "ACTIVE" | "INACTIVE";
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

interface BatchDataTableProps {
  batches: Batch[];
  basePath: "admin" | "teacher";
  onEdit: (batchId: string) => void;
  onDelete: (batch: { id: string; name: string }) => void;
  canManageCourse: boolean;
  canPublishCourse: boolean;
  showEditButton?: boolean;
}

export function BatchDataTable({
  batches,
  basePath,
  onEdit,
  onDelete,
  canManageCourse,
  canPublishCourse,
  showEditButton = true,
}: BatchDataTableProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: configData } = useOrganizationConfigAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Utility function to strip HTML tags and decode entities
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const filteredBatches = batches.filter((batch: Batch) => {
    const matchesSearch =
      batch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.exam || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.class || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (batch.category?.name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    let matchesStatus = true;
    if (statusFilter !== "all" && batch.status) {
      if (statusFilter === "published") {
        matchesStatus = batch.status === "ACTIVE";
      } else if (statusFilter === "unpublished") {
        matchesStatus = batch.status === "INACTIVE";
      }
    }

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const currency = configData?.data?.currency || "USD";
  const showCoursePricing =
    (configData?.data?.paymentMode || "per_course") === "per_course";

  const formatPrice = (price: number) => formatCurrency(price, currency);

  const calculateDiscountedPrice = (
    totalPrice: number,
    discountPercentage: number
  ) => {
    return totalPrice - (totalPrice * discountPercentage) / 100;
  };

  const getStatusBadge = (batch: Batch) => {
    if (batch.status?.toUpperCase() === "ACTIVE") {
      return <Badge variant="default">Published</Badge>;
    } else if (batch.status?.toUpperCase() === "INACTIVE") {
      return <Badge variant="outline">Unpublished</Badge>;
    }
    return <Badge variant="outline">Unpublished</Badge>;
  };

  const handleViewCourse = (batchId: string) => {
    router.push(`/${basePath}/courses/${batchId}`);
  };

  const handleToggleStatus = async (batch: Batch) => {
    setUpdatingStatus(batch.id);
    try {
      const newStatus =
        batch.status?.toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      // Update batch with new status
      await apiClient.put(`/admin/batches/${batch.id}`, {
        name: batch.name,
        description: batch.description,
        class: batch.class,
        exam: batch.exam,
        categoryId: batch.categoryId,
        imageUrl: batch.imageUrl,
        startDate: batch.startDate,
        endDate: batch.endDate,
        language: batch.language,
        totalPrice: batch.totalPrice,
        discountPercentage: batch.discountPercentage,
        faq: batch.faq,
        teacherId: batch.teacherId,
        status: newStatus,
      });

      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: queryKeys.batches });
    } catch (error) {
      console.error("Failed to update batch status:", error);
      alert("Failed to update batch status. Please try again.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  console.log(batches, "batches");

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search courses, categories, exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px] max-w-[350px]">
                Course
              </TableHead>
              <TableHead className="w-[160px]">Category</TableHead>
              <TableHead className="w-[140px]">Start Date</TableHead>
              <TableHead className="w-[140px]">End Date</TableHead>
              {showCoursePricing && (
                <TableHead className="w-[120px]">Price</TableHead>
              )}
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBatches.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showCoursePricing ? 7 : 6}
                  className="text-center py-8"
                >
                  <div className="flex flex-col items-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="font-semibold mb-2">No courses found</p>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search criteria or filters"
                        : "Get started by creating your first course"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBatches.map((batch: Batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium max-w-[350px]">
                    <div className="flex flex-col gap-1">
                      <div className="font-semibold line-clamp-2 break-words">
                        {batch.name}
                      </div>
                      {batch.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 break-words">
                          {stripHtml(batch.description)}
                        </div>
                      )}
                      {(batch.class || batch.exam) && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {batch.class && <span>Class {batch.class}</span>}
                          {batch.exam && <span>{batch.exam}</span>}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {batch.category?.name ? (
                      <Badge variant="secondary">
                        {formatCategoryLabel(batch.category)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDate(batch.startDate)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span>{formatDate(batch.endDate)}</span>
                    </div>
                  </TableCell>
                  {showCoursePricing && (
                  <TableCell className="whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-semibold text-primary">
                        {formatPrice(
                          calculateDiscountedPrice(
                            batch.totalPrice,
                            batch.discountPercentage
                          )
                        )}
                      </span>
                      {batch.discountPercentage > 0 && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatPrice(batch.totalPrice)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  )}
                  <TableCell className="whitespace-nowrap">
                    {getStatusBadge(batch)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleViewCourse(batch.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        {canManageCourse && showEditButton && (
                          <>
                            <DropdownMenuItem onClick={() => onEdit(batch.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {canPublishCourse && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(batch)}
                              disabled={updatingStatus === batch.id}
                            >
                              {batch.status?.toUpperCase() === "ACTIVE" ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Unpublish
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Publish
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {canManageCourse && (
                          <DropdownMenuItem
                            onClick={() => onDelete(batch)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
