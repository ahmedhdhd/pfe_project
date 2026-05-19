"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
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
} from "lucide-react";
import { useGetChapter, useGetTopicsByChapter, useDeleteTopic } from "@/hooks";
import { CreateTopicModal } from "@/components/common/create-topic-modal";
import { EditTopicModal } from "@/components/common/edit-topic-modal";
import { ViewTopicModal } from "@/components/common/view-topic-modal";
import { CreateContentModal } from "@/components/common/create-content-modal";

interface Topic {
  id: string;
  name: string;
  chapterId: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ChapterTopicsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.id as string;
  const subjectId = params.subjectId as string;
  const chapterId = params.chapterId as string;

  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [isEditTopicOpen, setIsEditTopicOpen] = useState(false);
  const [isViewTopicOpen, setIsViewTopicOpen] = useState(false);
  const [isCreateContentOpen, setIsCreateContentOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTopicId, setCopiedTopicId] = useState<string | null>(null);
  const [deleteTopicDialog, setDeleteTopicDialog] = useState<Topic | null>(null);

  const { data: chapter, isLoading: chapterLoading } = useGetChapter(chapterId);
  const { data: topics, isLoading: topicsLoading } =
    useGetTopicsByChapter(chapterId);
  const deleteTopicMutation = useDeleteTopic();

  const handleGoBack = () => {
    router.push(`/admin/courses/${courseId}/subjects/${subjectId}`);
  };

  const handleAddTopic = () => {
    setIsCreateTopicOpen(true);
  };

  const handleTopicCreated = () => {
    queryClient.invalidateQueries({
      queryKey: ["topics", "chapter", chapterId],
    });
  };

  const handleEditTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setIsEditTopicOpen(true);
  };

  const handleTopicUpdated = () => {
    queryClient.invalidateQueries({
      queryKey: ["topics", "chapter", chapterId],
    });
  };

  const handleViewTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setIsViewTopicOpen(true);
  };

  const handleCopyTopicId = async (topicId: string) => {
    try {
      await navigator.clipboard.writeText(topicId);
      setCopiedTopicId(topicId);
      setTimeout(() => setCopiedTopicId(null), 2000);
    } catch (error) {
      console.error("Failed to copy Topic ID:", error);
    }
  };

  const handleAddContent = (topicId: string) => {
    setSelectedTopic({ id: topicId } as Topic);
    setIsCreateContentOpen(true);
  };

  const handleContentCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["contents"] });
  };

  const handleDeleteTopic = (topic: Topic) => {
    setDeleteTopicDialog(topic);
  };

  const confirmDeleteTopic = async () => {
    if (deleteTopicDialog) {
      try {
        await deleteTopicMutation.mutateAsync(deleteTopicDialog.id);
        queryClient.invalidateQueries({
          queryKey: ["topics", "chapter", chapterId],
        });
        setDeleteTopicDialog(null);
      } catch (error) {
        console.error("Failed to delete topic:", error);
      }
    }
  };

  if (chapterLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Chapter not found</h2>
            <Button onClick={handleGoBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chapterData = chapter.data || chapter;
  const topicsData = topics?.data || [];
  const filteredTopics = topicsData.filter((topic: Topic) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              {chapterData.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage topics for this chapter
            </p>
          </div>
        </div>
        <Button variant="default" onClick={handleAddTopic}>
          <Plus className="mr-2 h-4 w-4" />
          Add Topic
        </Button>
      </div>

      {/* Topics List */}
      <Card>
        <CardHeader>
          <CardTitle>Topics ({topicsData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {topicsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">
                Loading topics...
              </span>
            </div>
          ) : topicsData.length > 0 ? (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search topics..."
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
                        Topic Name
                      </TableHead>
                      <TableHead className="min-w-[200px]">Topic ID</TableHead>
                      <TableHead className="w-[120px] text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTopics.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {searchQuery
                            ? `No topics found matching "${searchQuery}"`
                            : "No topics found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTopics.map((topic: Topic) => (
                        <TableRow key={topic.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span>{topic.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground font-mono">
                                {topic.id}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleCopyTopicId(topic.id)}
                                title="Copy Topic ID"
                              >
                                {copiedTopicId === topic.id ? (
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
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
                                <DropdownMenuItem
                                  onClick={() => handleViewTopic(topic)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleCopyTopicId(topic.id)}
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy ID
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleAddContent(topic.id)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Content
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleEditTopic(topic)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTopic(topic)}
                                  className="text-red-600"
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
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No topics yet</h3>
              <p className="text-muted-foreground mb-4">
                Click &quot;Add Topic&quot; to get started
              </p>
              <Button onClick={handleAddTopic}>
                <Plus className="mr-2 h-4 w-4" />
                Add Topic
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateTopicModal
        isOpen={isCreateTopicOpen}
        onClose={() => setIsCreateTopicOpen(false)}
        chapterId={chapterId}
        onSuccess={handleTopicCreated}
      />

      <EditTopicModal
        isOpen={isEditTopicOpen}
        onClose={() => {
          setIsEditTopicOpen(false);
          setSelectedTopic(null);
        }}
        topic={selectedTopic}
        onSuccess={handleTopicUpdated}
      />

      <ViewTopicModal
        isOpen={isViewTopicOpen}
        onClose={() => {
          setIsViewTopicOpen(false);
        }}
        topic={selectedTopic}
      />

      <CreateContentModal
        isOpen={isCreateContentOpen}
        onClose={() => {
          setIsCreateContentOpen(false);
          setSelectedTopic(null);
        }}
        topicId={selectedTopic?.id || ""}
        onSuccess={handleContentCreated}
      />

      {/* Delete Topic Confirmation Dialog */}
      <ConfirmationDialog
        open={!!deleteTopicDialog}
        onOpenChange={(open) => !open && setDeleteTopicDialog(null)}
        title="Delete Topic"
        description={`Are you sure you want to delete "${deleteTopicDialog?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDeleteTopic}
        variant="destructive"
        isLoading={deleteTopicMutation.isPending}
      />
    </div>
  );
}
