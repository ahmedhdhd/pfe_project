"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  FileText,
  MoreHorizontal,
  Search,
  Eye,
  Copy,
  Check,
  Brain,
  AlertTriangle,
} from "lucide-react";
import {
  useGetSubject,
  useDeleteSubject,
  useGetChaptersBySubject,
  useDeleteChapter,
  useGetTopicsByChapter,
  useGetWeakConcepts,
} from "@/hooks";
import { CreateChapterModal } from "@/components/common/create-chapter-modal";
import { EditChapterModal } from "@/components/common/edit-chapter-modal";
import { CreateTopicModal } from "@/components/common/create-topic-modal";

interface Chapter {
  id: string;
  name: string;
  subjectId: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function SubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.id as string;
  const subjectId = params.subjectId as string;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);
  const [isEditChapterOpen, setIsEditChapterOpen] = useState(false);
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedChapterId, setCopiedChapterId] = useState<string | null>(null);
  const [deleteChapterDialog, setDeleteChapterDialog] =
    useState<Chapter | null>(null);

  const { data: subject, isLoading: subjectLoading } = useGetSubject(subjectId);
  const { data: chapters, isLoading: chaptersLoading } =
    useGetChaptersBySubject(subjectId);
  const { data: weakConceptsResponse } = useGetWeakConcepts(courseId); // Since insights are per batch/course
  const deleteSubjectMutation = useDeleteSubject();
  const deleteChapterMutation = useDeleteChapter();

  const weakConcepts = weakConceptsResponse?.data || [];

  const handleGoBack = () => {
    router.push(`/admin/courses/${courseId}`);
  };

  const handleDeleteSubject = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteSubjectMutation.mutateAsync(subjectId);
      router.push(`/admin/courses/${courseId}`);
    } catch (error) {
      console.error("Failed to delete subject:", error);
    }
  };

  const handleAddChapter = () => {
    setIsCreateChapterOpen(true);
  };

  const handleChapterCreated = () => {
    queryClient.invalidateQueries({
      queryKey: ["chapters", "subject", subjectId],
    });
  };

  const handleEditChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setIsEditChapterOpen(true);
  };

  const handleChapterUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ["chapters", "subject", subjectId],
    });
  };

  const handleDeleteChapter = (chapter: Chapter) => {
    setDeleteChapterDialog(chapter);
  };

  const confirmDeleteChapter = async () => {
    if (deleteChapterDialog) {
      try {
        await deleteChapterMutation.mutateAsync(deleteChapterDialog.id);
        queryClient.invalidateQueries({
          queryKey: ["chapters", "subject", subjectId],
        });
        setDeleteChapterDialog(null);
      } catch (error) {
        console.error("Failed to delete chapter:", error);
      }
    }
  };

  const handleViewTopics = (chapterId: string) => {
    router.push(
      `/admin/courses/${courseId}/subjects/${subjectId}/chapters/${chapterId}`
    );
  };

  const handleCopyChapterId = async (chapterId: string) => {
    try {
      await navigator.clipboard.writeText(chapterId);
      setCopiedChapterId(chapterId);
      setTimeout(() => setCopiedChapterId(null), 2000);
    } catch (error) {
      console.error("Failed to copy Chapter ID:", error);
    }
  };

  if (subjectLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Subject not found</h2>
            <Button onClick={handleGoBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjectData = subject.data || subject;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {subjectData.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage chapters, topics, and content for this subject
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleDeleteSubject}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Subject
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="chapters" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chapters" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Chapters
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Student Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="mt-0 space-y-4">
          {/* Chapters List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Chapters ({chapters?.data?.length || 0})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="default" onClick={handleAddChapter}>
                <Plus className="mr-2 h-4 w-4" />
                Add Chapter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chaptersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">
                Loading chapters...
              </span>
            </div>
          ) : chapters?.data && chapters.data.length > 0 ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search chapters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">
                        Chapter Name
                      </TableHead>
                      <TableHead className="min-w-[200px]">
                        Chapter ID
                      </TableHead>
                      <TableHead className="w-[100px]">Topics</TableHead>
                      <TableHead className="w-[120px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapters.data.filter((chapter: Chapter) =>
                      chapter.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                    ).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {searchQuery
                            ? `No chapters found matching "${searchQuery}"`
                            : "No chapters found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      chapters.data
                        .filter((chapter: Chapter) =>
                          chapter.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        )
                        .map((chapter: Chapter) => (
                          <ChapterTableRow
                            key={chapter.id}
                            chapter={chapter}
                            copiedId={copiedChapterId}
                            onEdit={() => handleEditChapter(chapter)}
                            onDelete={() => handleDeleteChapter(chapter)}
                            onViewTopics={() => handleViewTopics(chapter.id)}
                            onAddTopic={() => {
                              setSelectedChapter({ id: chapter.id } as Chapter);
                              setIsCreateTopicOpen(true);
                            }}
                            onCopyId={() => handleCopyChapterId(chapter.id)}
                          />
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No chapters yet</h3>
              <p className="text-muted-foreground mb-4">
                Click &quot;Add Chapter&quot; to get started
              </p>
              <Button onClick={handleAddChapter}>
                <Plus className="mr-2 h-4 w-4" />
                Add Chapter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </TabsContent>

        <TabsContent value="insights" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Weak Concepts Identified by AI
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Topics where multiple students have struggled in the AI Tutor.
              </p>
            </CardHeader>
            <CardContent>
              {weakConcepts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                  <Brain className="h-10 w-10 mb-2 opacity-50" />
                  <p>No weak concepts flagged yet.</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concept</TableHead>
                        <TableHead>Suggested Review Topic</TableHead>
                        <TableHead className="text-right">Students Affected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weakConcepts.map((wc: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{wc.concept}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {wc.suggestedReviewTopic}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{wc.studentCount}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{subjectData.name}&quot;?
              This action cannot be undone. All chapters, topics, and content
              will be permanently removed.
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
              disabled={deleteSubjectMutation.isPending}
            >
              {deleteSubjectMutation.isPending
                ? "Deleting..."
                : "Delete Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <CreateChapterModal
        isOpen={isCreateChapterOpen}
        onClose={() => setIsCreateChapterOpen(false)}
        subjectId={subjectId}
        onSuccess={handleChapterCreated}
      />

      <EditChapterModal
        isOpen={isEditChapterOpen}
        onClose={() => {
          setIsEditChapterOpen(false);
          setSelectedChapter(null);
        }}
        chapter={selectedChapter}
        onSuccess={handleChapterUpdated}
      />

      <CreateTopicModal
        isOpen={isCreateTopicOpen}
        onClose={() => {
          setIsCreateTopicOpen(false);
          setSelectedChapter(null);
        }}
        chapterId={selectedChapter?.id || ""}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["topics"],
          });
        }}
      />

      {/* Delete Chapter Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteChapterDialog}
        onOpenChange={(open) => !open && setDeleteChapterDialog(null)}
        title="Delete Chapter"
        description={`Are you sure you want to delete "${deleteChapterDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDeleteChapter}
        variant="destructive"
        isLoading={deleteChapterMutation.isPending}
      />
    </div>
  );
}

function ChapterTableRow({
  chapter,
  copiedId,
  onEdit,
  onDelete,
  onViewTopics,
  onAddTopic,
  onCopyId,
}: {
  chapter: Chapter;
  copiedId: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onViewTopics: () => void;
  onAddTopic: () => void;
  onCopyId: () => void;
}) {
  const { data: topicsData } = useGetTopicsByChapter(chapter.id);
  const topics = topicsData?.data || [];

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-primary" />
          <span>{chapter.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-mono">
            {chapter.id}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onCopyId}
            title="Copy Chapter ID"
          >
            {copiedId === chapter.id ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </TableCell>
      <TableCell>
        {topics.length > 0 && (
          <Badge variant="secondary">{topics.length} topics</Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onViewTopics}>
              <Eye className="mr-2 h-4 w-4" />
              View Topics
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopyId}>
              <Copy className="mr-2 h-4 w-4" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAddTopic}>
              <Plus className="mr-2 h-4 w-4" />
              Add Topic
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
