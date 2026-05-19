"use client";

import { useState } from "react";
import Image from "next/image";
import DOMPurify from "dompurify";
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
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  teacherId: string;
}

interface SubjectCreationStepProps {
  data: {
    subjects: Array<{
      id: string;
      name: string;
      description: string;
      thumbnailUrl: string;
      teacherId: string;
    }>;
  };
  onUpdate: (data: Record<string, unknown>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isSubmitting: boolean;
}

export function SubjectCreationStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isSubmitting,
}: SubjectCreationStepProps) {
  const [subjects, setSubjects] = useState<Subject[]>(data.subjects || []);
  const [editingSubject, setEditingSubject] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // const { errors, validateField, validateForm } = useEnhancedFormValidation();

  const [newSubject, setNewSubject] = useState<Partial<Subject>>({
    name: "",
    description: "",
    thumbnailUrl: "",
    teacherId: "",
  });

  const handleAddSubject = () => {
    if (newSubject.name && newSubject.description) {
      const subject: Subject = {
        id: uuidv4(),
        name: newSubject.name,
        description: newSubject.description,
        thumbnailUrl: newSubject.thumbnailUrl || "",
        teacherId: newSubject.teacherId || "",
      };

      const updatedSubjects = [...subjects, subject];
      setSubjects(updatedSubjects);
      onUpdate({ subjects: updatedSubjects });

      setNewSubject({
        name: "",
        description: "",
        thumbnailUrl: "",
        teacherId: "",
      });
      setShowAddForm(false);
    }
  };

  const handleEditSubject = (subjectId: string) => {
    setEditingSubject(subjectId);
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject) {
      setNewSubject(subject);
    }
  };

  const handleUpdateSubject = () => {
    if (editingSubject && newSubject.name && newSubject.description) {
      const updatedSubjects = subjects.map((s) =>
        s.id === editingSubject ? { ...s, ...newSubject } : s
      );
      setSubjects(updatedSubjects);
      onUpdate({ subjects: updatedSubjects });
      setEditingSubject(null);
      setNewSubject({
        name: "",
        description: "",
        thumbnailUrl: "",
        teacherId: "",
      });
    }
  };

  const handleDeleteSubject = (subjectId: string) => {
    const updatedSubjects = subjects.filter((s) => s.id !== subjectId);
    setSubjects(updatedSubjects);
    onUpdate({ subjects: updatedSubjects });
  };

  const handleCancelEdit = () => {
    setEditingSubject(null);
    setShowAddForm(false);
    setNewSubject({
      name: "",
      description: "",
      thumbnailUrl: "",
      teacherId: "",
    });
  };

  const handleNext = () => {
    if (subjects.length > 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Course Subjects</CardTitle>
          <CardDescription>
            Create subjects for your course. Each subject will contain chapters
            and topics.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Add/Edit Subject Form */}
      {(showAddForm || editingSubject) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>
              {editingSubject ? "Edit Subject" : "Add New Subject"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name *</Label>
                <Input
                  id="subjectName"
                  value={newSubject.name || ""}
                  onChange={(e) =>
                    setNewSubject({ ...newSubject, name: e.target.value })
                  }
                  placeholder="e.g., Mathematics, Physics, Chemistry"
                  className=""
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjectThumbnail">Thumbnail URL</Label>
                <div className="flex space-x-2">
                  <Input
                    id="subjectThumbnail"
                    value={newSubject.thumbnailUrl || ""}
                    onChange={(e) =>
                      setNewSubject({
                        ...newSubject,
                        thumbnailUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subjectDescription">Subject Description *</Label>
              <RichTextEditor
                content={newSubject.description || ""}
                onChange={(content) =>
                  setNewSubject({ ...newSubject, description: content })
                }
                placeholder="Describe what this subject covers and what students will learn..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                onClick={
                  editingSubject ? handleUpdateSubject : handleAddSubject
                }
                disabled={!newSubject.name || !newSubject.description}
              >
                {editingSubject ? "Update Subject" : "Add Subject"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjects List */}
      <div className="space-y-4">
        {subjects.map((subject) => (
          <Card key={subject.id} className="relative">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                {/* Thumbnail */}
                <div className="shrink-0">
                  {subject.thumbnailUrl ? (
                    <Image
                      src={subject.thumbnailUrl}
                      alt={subject.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{subject.name}</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSubject(subject.id)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(subject.description),
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {subjects.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No subjects added yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding subjects to your course
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Subject
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Subject Button */}
      {!showAddForm && !editingSubject && subjects.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Another Subject
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
          disabled={isSubmitting || subjects.length === 0}
        >
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
