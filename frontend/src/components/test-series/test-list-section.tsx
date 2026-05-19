"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  ArrowRight,
} from "lucide-react";
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
import { useDeleteTest, Test } from "@/hooks/test-series";
import { CreateTestModal } from "./create-test-modal";

interface TestListSectionProps {
  testSeriesId: string;
  tests: Test[];
  onRefetch: () => void;
  basePath?: "admin" | "teacher";
}

export function TestListSection({
  testSeriesId,
  tests,
  onRefetch,
  basePath = "admin",
}: TestListSectionProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteTest();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      onRefetch();
    } catch (error) {
      console.error("Failed to delete test:", error);
    }
  };

  const handleViewTest = (testId: string) => {
    router.push(`/${basePath}/test-series/${testSeriesId}/tests/${testId}`);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tests</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all assessments inside this bundle
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Test
          </Button>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No Assessments Yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first assessment
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Assessment
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow
                      key={test.id}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell onClick={() => handleViewTest(test.id)}>
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{test.title}</div>
                            {test.description?.topics &&
                              test.description.topics.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  {test.description.topics
                                    .slice(0, 2)
                                    .join(", ")}
                                  {test.description.topics.length > 2 && "..."}
                                </div>
                              )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleViewTest(test.id)}>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{test.durationMinutes} min</span>
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleViewTest(test.id)}>
                        <div className="font-medium">{test.totalMarks}</div>
                        <div className="text-xs text-muted-foreground">
                          Passing: {test.passingMarks}
                        </div>
                      </TableCell>
                      <TableCell onClick={() => handleViewTest(test.id)}>
                        {test.sectionCount || 0}
                      </TableCell>
                      <TableCell onClick={() => handleViewTest(test.id)}>
                        {test.questionCount || 0}
                      </TableCell>
                      <TableCell onClick={() => handleViewTest(test.id)}>
                        <Badge
                          variant={test.isPublished ? "default" : "secondary"}
                          className={
                            test.isPublished
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : ""
                          }
                        >
                          {test.isPublished ? (
                            <>
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Published
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-1 h-3 w-3" />
                              Draft
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTest(test.id)}
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTest(test.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(test.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateTestModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        testSeriesId={testSeriesId}
        onSuccess={() => {
          onRefetch();
          setIsCreateModalOpen(false);
        }}
      />

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this test? This action cannot be
              undone and will delete all sections and questions.
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
    </>
  );
}
