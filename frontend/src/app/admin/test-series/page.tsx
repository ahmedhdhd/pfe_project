"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, Shapes, X } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTestSeriesList } from "@/hooks/test-series";
import { useGetCategories } from "@/hooks";
import { TestSeriesDataTable } from "@/components/test-series/test-series-data-table";
import { CreateTestSeriesModal } from "@/components/test-series/create-test-series-modal";
import { CategoryOption, getRootCategories } from "@/lib/categories";

export default function TestSeriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(
    undefined
  );
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: categoriesResponse } = useGetCategories();
  const categories = useMemo(
    () =>
      getRootCategories(
        ((categoriesResponse?.data as CategoryOption[] | undefined) ?? [])
      ),
    [categoriesResponse?.data]
  );

  const { data, isLoading, refetch } = useTestSeriesList({
    page,
    limit: 10,
    categoryId: categoryFilter !== "ALL" ? categoryFilter : undefined,
    isActive: isActiveFilter,
    search: searchQuery || undefined,
  });

  const testSeries = Array.isArray(data?.data) ? data.data : [];
  const pagination = data?.pagination;

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryFilter("ALL");
    setIsActiveFilter(undefined);
    setPage(1);
  };

  const hasActiveFilters =
    searchQuery || categoryFilter !== "ALL" || isActiveFilter !== undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Bundles"
        description="Manage grouped mock exams, practice sets, and assessments for your students"
        breadcrumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Assessment Bundles" },
        ]}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Bundle
          </Button>
        }
      />

      <Card>
        <CardHeader className="sticky top-16 z-30 border-b bg-card/80 backdrop-blur supports-backdrop-filter:bg-card/60">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>All Assessment Bundles</CardTitle>
              <CardDescription>
                Browse and manage every assessment bundle in your platform
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="shrink-0"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assessment bundles..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <Shapes className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={
                isActiveFilter === undefined
                  ? "ALL"
                  : isActiveFilter
                  ? "ACTIVE"
                  : "INACTIVE"
              }
              onValueChange={(value) => {
                setIsActiveFilter(
                  value === "ALL"
                    ? undefined
                    : value === "ACTIVE"
                    ? true
                    : false
                );
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TestSeriesDataTable
            data={testSeries}
            isLoading={isLoading}
            onRefetch={() => refetch()}
            basePath="admin"
          />

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page || pagination.currentPage} of{" "}
                {pagination.totalPages} ({pagination.totalCount} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!(pagination.hasPrevPage ?? pagination.hasPrevious)}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!(pagination.hasNextPage ?? pagination.hasNext)}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isLoading && testSeries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              No assessment bundles found
            </h3>
            <p className="mb-4 text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your filters"
                : "Get started by creating your first assessment bundle"}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Bundle
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <CreateTestSeriesModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
