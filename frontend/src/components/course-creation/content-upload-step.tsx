"use client";

import { useState } from "react";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Video,
  FileText,
  Play,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Content {
  id: string;
  name: string;
  type: "lecture" | "pdf";
  videoUrl?: string;
  pdfUrl?: string;
  videoThumbnail?: string;
  videoDuration?: number;
}

interface ContentUploadStepProps {
  data: {
    chapters: Array<{
      id: string;
      subjectId: string;
      name: string;
      lectureCount: number;
      lectureDuration: string;
      topics: Array<{
        id: string;
        name: string;
        content: Array<{
          id: string;
          name: string;
          type: "lecture" | "pdf";
          videoUrl?: string;
          pdfUrl?: string;
          videoThumbnail?: string;
          videoDuration?: number;
        }>;
      }>;
    }>;
  };
  onUpdate: (data: Record<string, unknown>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isSubmitting: boolean;
}

export function ContentUploadStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isSubmitting,
}: ContentUploadStepProps) {
  const [content, setContent] = useState<Content[]>([]);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // const { errors, validateField, validateForm } = useEnhancedFormValidation();

  const [newContent, setNewContent] = useState<Partial<Content>>({
    name: "",
    type: "lecture",
    videoUrl: "",
    pdfUrl: "",
    videoThumbnail: "",
    videoDuration: 0,
  });

  const handleAddContent = () => {
    if (newContent.name && newContent.type) {
      const contentItem: Content = {
        id: uuidv4(),
        name: newContent.name,
        type: newContent.type as "lecture" | "pdf",
        videoUrl: newContent.videoUrl,
        pdfUrl: newContent.pdfUrl,
        videoThumbnail: newContent.videoThumbnail,
        videoDuration: newContent.videoDuration,
      };

      const updatedContent = [...content, contentItem];
      setContent(updatedContent);
      onUpdate({ content: updatedContent });

      setNewContent({
        name: "",
        type: "lecture",
        videoUrl: "",
        pdfUrl: "",
        videoThumbnail: "",
        videoDuration: 0,
      });
      setShowAddForm(false);
    }
  };

  const handleEditContent = (contentId: string) => {
    setEditingContent(contentId);
    const contentItem = content.find((c) => c.id === contentId);
    if (contentItem) {
      setNewContent(contentItem);
    }
  };

  const handleUpdateContent = () => {
    if (editingContent && newContent.name && newContent.type) {
      const updatedContent = content.map((c) =>
        c.id === editingContent ? { ...c, ...newContent } : c
      );
      setContent(updatedContent);
      onUpdate({ content: updatedContent });
      setEditingContent(null);
      setNewContent({
        name: "",
        type: "lecture",
        videoUrl: "",
        pdfUrl: "",
        videoThumbnail: "",
        videoDuration: 0,
      });
    }
  };

  const handleDeleteContent = (contentId: string) => {
    const updatedContent = content.filter((c) => c.id !== contentId);
    setContent(updatedContent);
    onUpdate({ content: updatedContent });
  };

  const handleCancelEdit = () => {
    setEditingContent(null);
    setShowAddForm(false);
    setNewContent({
      name: "",
      type: "lecture",
      videoUrl: "",
      pdfUrl: "",
      videoThumbnail: "",
      videoDuration: 0,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleNext = () => {
    // Validate that all content items have required fields
    const isValid = content.every((item) => {
      if (item.type === "lecture") {
        return item.name && item.videoUrl;
      } else if (item.type === "pdf") {
        return item.name && item.pdfUrl;
      }
      return false;
    });

    if (content.length > 0 && isValid) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Content Upload</CardTitle>
          <CardDescription>
            Upload lectures, videos, and PDF materials for your course topics.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Add/Edit Content Form */}
      {(showAddForm || editingContent) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingContent ? "Edit Content" : "Add New Content"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contentName">Content Name *</Label>
                <Input
                  id="contentName"
                  value={newContent.name || ""}
                  onChange={(e) =>
                    setNewContent({ ...newContent, name: e.target.value })
                  }
                  placeholder="e.g., Introduction to Algebra"
                  className=""
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type *</Label>
                <Select
                  value={newContent.type || "lecture"}
                  onValueChange={(value) =>
                    setNewContent({
                      ...newContent,
                      type: value as "lecture" | "pdf",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Video Lecture</SelectItem>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newContent.type === "lecture" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoUrl">Video URL *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="videoUrl"
                        value={newContent.videoUrl || ""}
                        onChange={(e) =>
                          setNewContent({
                            ...newContent,
                            videoUrl: e.target.value,
                          })
                        }
                        placeholder="https://youtube.com/watch?v=..."
                      />
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoDuration">Duration (minutes)</Label>
                    <Input
                      id="videoDuration"
                      type="number"
                      value={newContent.videoDuration || 0}
                      onChange={(e) =>
                        setNewContent({
                          ...newContent,
                          videoDuration: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="videoThumbnail">Thumbnail URL</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="videoThumbnail"
                      value={newContent.videoThumbnail || ""}
                      onChange={(e) =>
                        setNewContent({
                          ...newContent,
                          videoThumbnail: e.target.value,
                        })
                      }
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {newContent.type === "pdf" && (
              <div className="space-y-2">
                <Label htmlFor="pdfUrl">PDF URL *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="pdfUrl"
                    value={newContent.pdfUrl || ""}
                    onChange={(e) =>
                      setNewContent({ ...newContent, pdfUrl: e.target.value })
                    }
                    placeholder="https://example.com/document.pdf"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                onClick={
                  editingContent ? handleUpdateContent : handleAddContent
                }
                disabled={!newContent.name || !newContent.type}
              >
                {editingContent ? "Update Content" : "Add Content"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {content.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                {/* Thumbnail/Icon */}
                <div className="shrink-0">
                  {item.type === "lecture" ? (
                    <div className="relative">
                      {item.videoThumbnail ? (
                        <Image
                          src={item.videoThumbnail}
                          alt={item.name}
                          width={64}
                          height={64}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Video className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {formatDuration(item.videoDuration || 0)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      <Badge
                        variant={
                          item.type === "lecture" ? "default" : "secondary"
                        }
                      >
                        {item.type === "lecture" ? "Video" : "PDF"}
                      </Badge>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditContent(item.id)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContent(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    {item.type === "lecture" && (
                      <>
                        <div className="flex items-center space-x-1">
                          <Play className="h-4 w-4" />
                          <span>Video Lecture</span>
                        </div>
                        {item.videoDuration && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatDuration(item.videoDuration)}</span>
                          </div>
                        )}
                      </>
                    )}
                    {item.type === "pdf" && (
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>PDF Document</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {content.length === 0 && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Thumbnail Skeleton */}
                    <Skeleton className="w-full sm:w-48 h-32 shrink-0" />
                    {/* Content Skeleton */}
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Content Button */}
      {!showAddForm && !editingContent && content.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add More Content
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstStep}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={isSubmitting || content.length === 0}
        >
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
