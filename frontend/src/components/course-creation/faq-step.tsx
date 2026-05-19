"use client";

import { useState } from "react";
import DOMPurify from "dompurify";
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
  HelpCircle,
} from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  description: string;
}

interface FAQStepProps {
  data: {
    faq: Array<{
      id: string;
      question: string;
      description: string;
    }>;
  };
  onUpdate: (data: Record<string, unknown>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isSubmitting: boolean;
}

export function FAQStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isSubmitting,
}: FAQStepProps) {
  const [faqs, setFaqs] = useState<FAQ[]>(data.faq || []);
  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // const { errors, validateField, validateForm } = useEnhancedFormValidation();

  const [newFaq, setNewFaq] = useState<Partial<FAQ>>({
    question: "",
    description: "",
  });

  const handleAddFaq = () => {
    if (newFaq.question && newFaq.description) {
      const faq: FAQ = {
        id: Date.now().toString(),
        question: newFaq.question,
        description: newFaq.description,
      };

      const updatedFaqs = [...faqs, faq];
      setFaqs(updatedFaqs);
      onUpdate({ faq: updatedFaqs });

      setNewFaq({
        question: "",
        description: "",
      });
      setShowAddForm(false);
    }
  };

  const handleEditFaq = (faqId: string) => {
    setEditingFaq(faqId);
    const faq = faqs.find((f) => f.id === faqId);
    if (faq) {
      setNewFaq(faq);
    }
  };

  const handleUpdateFaq = () => {
    if (editingFaq && newFaq.question && newFaq.description) {
      const updatedFaqs = faqs.map((f) =>
        f.id === editingFaq ? { ...f, ...newFaq } : f
      );
      setFaqs(updatedFaqs);
      onUpdate({ faq: updatedFaqs });
      setEditingFaq(null);
      setNewFaq({
        question: "",
        description: "",
      });
    }
  };

  const handleDeleteFaq = (faqId: string) => {
    const updatedFaqs = faqs.filter((f) => f.id !== faqId);
    setFaqs(updatedFaqs);
    onUpdate({ faq: updatedFaqs });
  };

  const handleCancelEdit = () => {
    setEditingFaq(null);
    setShowAddForm(false);
    setNewFaq({
      question: "",
      description: "",
    });
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Add common questions and answers to help students understand your
            course better.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Add/Edit FAQ Form */}
      {(showAddForm || editingFaq) && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>{editingFaq ? "Edit FAQ" : "Add New FAQ"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faqTitle">Question *</Label>
              <Input
                id="faqTitle"
                value={newFaq.question || ""}
                onChange={(e) =>
                  setNewFaq({ ...newFaq, question: e.target.value })
                }
                placeholder="e.g., What prerequisites do I need for this course?"
                className=""
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faqDescription">Answer *</Label>
              <RichTextEditor
                content={newFaq.description || ""}
                onChange={(content) =>
                  setNewFaq({ ...newFaq, description: content })
                }
                placeholder="Provide a detailed answer to the question..."
                className="min-h-[150px]"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                onClick={editingFaq ? handleUpdateFaq : handleAddFaq}
                disabled={!newFaq.question || !newFaq.description}
              >
                {editingFaq ? "Update FAQ" : "Add FAQ"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ List */}
      <div className="space-y-4">
        {faqs.map((faq) => (
          <Card key={faq.id}>
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{faq.question}</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditFaq(faq.id)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(faq.description),
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {faqs.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No FAQs added yet</h3>
              <p className="text-muted-foreground mb-4">
                Add frequently asked questions to help students understand your
                course
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First FAQ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add FAQ Button */}
      {!showAddForm && !editingFaq && faqs.length > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Another FAQ
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
        <Button type="button" onClick={handleNext} disabled={isSubmitting}>
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
