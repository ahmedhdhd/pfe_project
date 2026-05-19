"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateAssignment,
  useDeleteAssignment,
  useGetAllBatches,
  useGetAssignments,
  useGetCourseOutline,
} from "@/hooks";
import type { Assignment } from "@/hooks/api";

type PortalRole = "admin" | "teacher";

type BatchOption = {
  id: string;
  name: string;
};

type TopicOption = {
  id: string;
  name: string;
  chapterName: string;
};

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data?: unknown }).data;
    return Array.isArray(data) ? (data as T[]) : [];
  }
  return [];
}

function getStatusVariant(status: Assignment["status"]) {
  if (status === "PUBLISHED") return "default";
  if (status === "ARCHIVED") return "secondary";
  return "outline";
}

export function AssignmentManagementPage({ role }: { role: PortalRole }) {
  const searchParams = useSearchParams();
  const hasAppliedDeepLinkRef = useRef(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState({
    batchId: "",
    topicId: "none",
    title: "",
    description: "",
    status: "DRAFT" as Assignment["status"],
  });

  const { data: assignmentsResponse, isLoading } = useGetAssignments();
  const { data: batchesResponse } = useGetAllBatches();
  const { data: outlineResponse } = useGetCourseOutline(formData.batchId);
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const assignments = normalizeList<Assignment>(assignmentsResponse);
  const batches = normalizeList<BatchOption>(batchesResponse);

  const topics = useMemo<TopicOption[]>(() => {
    const chapters = normalizeList<{
      id: string;
      name: string;
      topics?: Array<{ id: string; name: string }>;
    }>(outlineResponse);

    return chapters.flatMap((chapter) =>
      (chapter.topics || []).map((topic) => ({
        id: topic.id,
        name: topic.name,
        chapterName: chapter.name,
      }))
    );
  }, [outlineResponse]);

  const filteredAssignments = assignments.filter((assignment) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      assignment.title.toLowerCase().includes(q) ||
      assignment.batch?.name?.toLowerCase().includes(q) ||
      assignment.topic?.name?.toLowerCase().includes(q)
    );
  });

  const resetForm = () => {
    setFormData({
      batchId: "",
      topicId: "none",
      title: "",
      description: "",
      status: "DRAFT",
    });
  };

  useEffect(() => {
    if (hasAppliedDeepLinkRef.current) return;

    const shouldOpenCreate = searchParams.get("new") === "1";
    if (!shouldOpenCreate) return;

    const batchId = searchParams.get("batchId") || "";
    const topicId = searchParams.get("topicId") || "none";

    setFormData((prev) => ({
      ...prev,
      batchId,
      topicId,
    }));
    setIsCreateOpen(true);
    hasAppliedDeepLinkRef.current = true;
  }, [searchParams]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    if (!formData.batchId || !formData.title.trim()) {
      toast.error("Select a course and enter an assignment title.");
      return;
    }

    try {
      const result = await createAssignment.mutateAsync({
        batchId: formData.batchId,
        topicId: formData.topicId === "none" ? undefined : formData.topicId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
      });

      const assignmentId = result.data?.id;
      toast.success("Assignment created.");
      resetForm();
      setIsCreateOpen(false);

      if (assignmentId) {
        window.location.href = `/${role}/assignments/${assignmentId}`;
      }
    } catch {
      toast.error("Unable to create assignment.");
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteTarget) return;

    try {
      await deleteAssignment.mutateAsync(deleteTarget.id);
      toast.success("Assignment deleted.");
      setDeleteTarget(null);
    } catch {
      toast.error("Unable to delete assignment.");
    }
  };

  const breadcrumbs =
    role === "admin"
      ? [
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Assignments" },
        ]
      : [
          { label: "Teacher", href: "/teacher/dashboard" },
          { label: "Assignments" },
        ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Create, edit, and review assignments from every course."
        breadcrumbs={breadcrumbs}
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Assignment
          </Button>
        }
      />

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              All Assignments
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredAssignments.length} assignment
              {filteredAssignments.length === 1 ? "" : "s"} found
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assignments..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Submissions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      Loading assignments...
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      No assignments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="font-medium">{assignment.title}</div>
                        {assignment.description ? (
                          <div className="line-clamp-1 text-xs text-muted-foreground">
                            {assignment.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{assignment.batch?.name || "Course"}</TableCell>
                      <TableCell>{assignment.topic?.name || "Course level"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(assignment.status)}>
                          {assignment.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{assignment._count?.questions ?? 0}</TableCell>
                      <TableCell>{assignment._count?.submissions ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              aria-label="Open actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/${role}/assignments/${assignment.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/${role}/assignments/${assignment.id}`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteTarget(assignment)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
            <DialogDescription>
              Attach an assignment to a course, optionally inside a topic.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Course *</Label>
                <Select
                  value={formData.batchId}
                  onValueChange={(batchId) =>
                    setFormData((prev) => ({
                      ...prev,
                      batchId,
                      topicId: "none",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic</Label>
                <Select
                  value={formData.topicId}
                  onValueChange={(topicId) =>
                    setFormData((prev) => ({ ...prev, topicId }))
                  }
                  disabled={!formData.batchId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Course level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Course level</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.chapterName} / {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-title">Title *</Label>
              <Input
                id="assignment-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g. Chapter 1 practice task"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignment-description">Description</Label>
              <Textarea
                id="assignment-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
                placeholder="Explain what students should submit."
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(status) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: status as Assignment["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAssignment.isPending}>
                {createAssignment.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete assignment"
        description={`Are you sure you want to delete "${deleteTarget?.title || "this assignment"}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteAssignment}
        isLoading={deleteAssignment.isPending}
      />
    </div>
  );
}
