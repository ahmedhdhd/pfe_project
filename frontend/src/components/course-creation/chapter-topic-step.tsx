"use client";

import { useState } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
} from "lucide-react";

interface Topic {
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
}

interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  lectureCount: number;
  lectureDuration: string;
  topics: Topic[];
}

interface ChapterTopicStepProps {
  data: {
    subjects: Array<{
      id: string;
      name: string;
      description: string;
      thumbnailUrl: string;
      teacherId: string;
    }>;
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

export function ChapterTopicStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isSubmitting,
}: ChapterTopicStepProps) {
  const [chapters, setChapters] = useState<Chapter[]>(data.chapters || []);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );
  const [editingChapter, setEditingChapter] = useState<string | null>(null);
  const [showAddChapter, setShowAddChapter] = useState(false);

  // const { errors, validateField, validateForm } = useEnhancedFormValidation();

  const [newChapter, setNewChapter] = useState<Partial<Chapter>>({
    name: "",
    lectureCount: 0,
    lectureDuration: "",
    topics: [],
  });

  const [newTopic, setNewTopic] = useState<{ name: string }>({ name: "" });

  const handleAddChapter = () => {
    if (newChapter.name) {
      const chapter: Chapter = {
        id: uuidv4(),
        subjectId: data.subjects?.[0]?.id || "",
        name: newChapter.name,
        lectureCount: newChapter.lectureCount || 0,
        lectureDuration: newChapter.lectureDuration || "",
        topics: [],
      };

      const updatedChapters = [...chapters, chapter];
      setChapters(updatedChapters);
      onUpdate({ chapters: updatedChapters });

      setNewChapter({
        name: "",
        lectureCount: 0,
        lectureDuration: "",
        topics: [],
      });
      setShowAddChapter(false);
    }
  };

  const handleEditChapter = (chapterId: string) => {
    setEditingChapter(chapterId);
    const chapter = chapters.find((c) => c.id === chapterId);
    if (chapter) {
      setNewChapter(chapter);
    }
  };

  const handleUpdateChapter = () => {
    if (editingChapter && newChapter.name) {
      const updatedChapters = chapters.map((c) =>
        c.id === editingChapter ? { ...c, ...newChapter } : c
      );
      setChapters(updatedChapters);
      onUpdate({ chapters: updatedChapters });
      setEditingChapter(null);
      setNewChapter({
        name: "",
        lectureCount: 0,
        lectureDuration: "",
        topics: [],
      });
    }
  };

  const handleDeleteChapter = (chapterId: string) => {
    const updatedChapters = chapters.filter((c) => c.id !== chapterId);
    setChapters(updatedChapters);
    onUpdate({ chapters: updatedChapters });
  };

  const handleAddTopic = (chapterId: string) => {
    if (newTopic.name) {
      const topic: Topic = {
        id: uuidv4(),
        name: newTopic.name,
        content: [],
      };

      const updatedChapters = chapters.map((c) =>
        c.id === chapterId ? { ...c, topics: [...c.topics, topic] } : c
      );
      setChapters(updatedChapters);
      onUpdate({ chapters: updatedChapters });
      setNewTopic({ name: "" });
    }
  };

  const handleEditTopic = (chapterId: string, topicId: string) => {
    const chapter = chapters.find((c) => c.id === chapterId);
    const topic = chapter?.topics.find((t) => t.id === topicId);
    if (topic) {
      setNewTopic({ name: topic.name });
    }
  };

  const handleDeleteTopic = (chapterId: string, topicId: string) => {
    const updatedChapters = chapters.map((c) =>
      c.id === chapterId
        ? { ...c, topics: c.topics.filter((t) => t.id !== topicId) }
        : c
    );
    setChapters(updatedChapters);
    onUpdate({ chapters: updatedChapters });
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleCancelEdit = () => {
    setEditingChapter(null);
    setShowAddChapter(false);
    setNewChapter({
      name: "",
      lectureCount: 0,
      lectureDuration: "",
      topics: [],
    });
    setNewTopic({ name: "" });
  };

  const handleNext = () => {
    if (chapters.length > 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Chapters & Topics</CardTitle>
          <CardDescription>
            Organize your course content into chapters and topics. Each chapter
            can contain multiple topics.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Add Chapter Form */}
      {(showAddChapter || editingChapter) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingChapter ? "Edit Chapter" : "Add New Chapter"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chapterName">Chapter Name *</Label>
                <Input
                  id="chapterName"
                  value={newChapter.name || ""}
                  onChange={(e) =>
                    setNewChapter({ ...newChapter, name: e.target.value })
                  }
                  placeholder="e.g., Introduction to Algebra"
                  className=""
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lectureCount">Lecture Count</Label>
                <Input
                  id="lectureCount"
                  type="number"
                  value={newChapter.lectureCount || 0}
                  onChange={(e) =>
                    setNewChapter({
                      ...newChapter,
                      lectureCount: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lectureDuration">Duration</Label>
                <Input
                  id="lectureDuration"
                  value={newChapter.lectureDuration || ""}
                  onChange={(e) =>
                    setNewChapter({
                      ...newChapter,
                      lectureDuration: e.target.value,
                    })
                  }
                  placeholder="e.g., 2 hours, 30 min"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                onClick={
                  editingChapter ? handleUpdateChapter : handleAddChapter
                }
                disabled={!newChapter.name}
              >
                {editingChapter ? "Update Chapter" : "Add Chapter"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapters List */}
      <div className="space-y-4">
        {chapters.map((chapter) => (
          <Card key={chapter.id}>
            <Collapsible
              open={expandedChapters.has(chapter.id)}
              onOpenChange={() => toggleChapter(chapter.id)}
            >
              <CollapsibleTrigger asChild>
                <CardContent className="p-6 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {expandedChapters.has(chapter.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {chapter.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{chapter.lectureCount} lectures</span>
                          <span>{chapter.lectureDuration}</span>
                          <span>{chapter.topics.length} topics</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditChapter(chapter.id);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChapter(chapter.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {/* Topics List */}
                    {chapter.topics.map((topic) => (
                      <div
                        key={topic.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{topic.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleEditTopic(chapter.id, topic.id)
                            }
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteTopic(chapter.id, topic.id)
                            }
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Add Topic Form */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add a new topic..."
                        value={newTopic.name}
                        onChange={(e) => setNewTopic({ name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleAddTopic(chapter.id);
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleAddTopic(chapter.id)}
                        disabled={!newTopic.name}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {chapters.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No chapters added yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding chapters to organize your course content
              </p>
              <Button onClick={() => setShowAddChapter(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Chapter
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Chapter Button */}
      {!showAddChapter && !editingChapter && chapters.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAddChapter(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Another Chapter
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
          disabled={isSubmitting || chapters.length === 0}
        >
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
