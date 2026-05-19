"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TableActionsDropdown } from "@/components/common/table-actions-dropdown";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TestSeries,
  useDeleteTestSeries,
  useUpdateTestSeries,
} from "@/hooks/test-series";
import { EditTestSeriesModal } from "./edit-test-series-modal";

interface TestSeriesDataTableProps {
  data: TestSeries[];
  isLoading?: boolean;
  onRefetch?: () => void;
  basePath?: "admin" | "teacher";
}

const getCategoryLabel = (series: TestSeries) => {
  if (series.category?.parent?.name) {
    return `${series.category.parent.name} / ${series.category.name}`;
  }

  return series.category?.name || series.exam || "Uncategorized";
};

export function TestSeriesDataTable({
  data,
  isLoading,
  onRefetch,
  basePath = "admin",
}: TestSeriesDataTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editSeries, setEditSeries] = useState<TestSeries | null>(null);
  const deleteMutation = useDeleteTestSeries();
  const updateMutation = useUpdateTestSeries();

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      onRefetch?.();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleToggleStatus = async (series: TestSeries) => {
    try {
      await updateMutation.mutateAsync({
        id: series.id,
        data: { isPublished: !series.isPublished },
      });
      onRefetch?.();
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stats</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  No assessment bundles found
                </TableCell>
              </TableRow>
            ) : (
              data.map((series) => (
                <TableRow key={series.id}>
                  <TableCell>
                    <div className="flex items-start space-x-3">
                      {series.imageUrl && (
                        <img
                          src={series.imageUrl}
                          alt={series.title}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <Link
                          href={`/${basePath}/test-series/${series.id}`}
                          className="font-medium hover:underline"
                        >
                          {series.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryLabel(series)} • {series.testCount} tests
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryLabel(series)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>Tests: {series.testCount}</p>
                      <p className="text-muted-foreground">
                        Questions: {series.totalQuestions}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={series.isPublished ? "default" : "secondary"}
                      className={
                        series.isPublished
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : ""
                      }
                    >
                      {series.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(series.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TableActionsDropdown
                      id={series.id}
                      viewHref={`/${basePath}/test-series/${series.id}`}
                      onEdit={() => setEditSeries(series)}
                      onDelete={() => setDeleteId(series.id)}
                      onToggleStatus={() => handleToggleStatus(series)}
                      isPublished={series.isPublished}
                      isDeleting={deleteMutation.isPending}
                      isUpdating={updateMutation.isPending}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              assessment bundle and all associated assessments, sections, and
              questions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editSeries && (
        <EditTestSeriesModal
          open={!!editSeries}
          onOpenChange={(open) => {
            if (!open) setEditSeries(null);
          }}
          testSeries={editSeries}
          onSuccess={() => {
            setEditSeries(null);
            onRefetch?.();
          }}
        />
      )}
    </>
  );
}
