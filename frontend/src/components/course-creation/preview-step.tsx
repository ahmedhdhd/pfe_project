"use client";

import { useState } from "react";
import Image from "next/image";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Check,
  Eye,
  BookOpen,
  FileText,
  Video,
  Clock,
  Users,
} from "lucide-react";
import { useOrgPaymentMode } from "@/lib/store/organization-config";

interface PreviewStepProps {
  data: {
    name: string;
    description: string;
    class: string;
    exam: string;
    language: string;
    startDate: string;
    endDate: string;
    validity: string;
    totalPrice: number;
    discountPercentage: number;
    discountedPrice: number;
    imageUrl: string;
    teacherId: string;
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
      }>;
    }>;
    schedules: Array<{
      id: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      date?: string;
      isRecurring: boolean;
    }>;
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
  isLastStep: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function PreviewStep({
  data,
  onPrevious,
  isFirstStep,
  isSubmitting,
}: PreviewStepProps) {
  const paymentMode = useOrgPaymentMode();
  const showCoursePricing = paymentMode === "per_course";
  const [isPublishing, setIsPublishing] = useState(false);

  // const { errors, validateField, validateForm } = useEnhancedFormValidation();

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // TODO: Implement course publishing API call
      console.log("Publishing course with data:", data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Course published successfully
      console.log("Course published successfully!");
    } catch (error) {
      console.error("Failed to publish course:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(price);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const totalLectures =
    data.chapters?.reduce(
      (sum: number, chapter: { lectureCount: number }) =>
        sum + (chapter.lectureCount || 0),
      0
    ) || 0;
  const totalTopics =
    data.chapters?.reduce(
      (sum: number, chapter: { topics: Array<{ id: string; name: string }> }) =>
        sum + (chapter.topics?.length || 0),
      0
    ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Course Preview</span>
          </CardTitle>
          <CardDescription>
            Review all the details before publishing your course
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Course Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Course Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Course Image and Basic Info */}
          <div className="flex items-start space-x-6">
            {data.imageUrl ? (
              <Image
                src={data.imageUrl}
                alt={data.name}
                width={128}
                height={128}
                className="w-32 h-32 rounded-lg object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{data.name}</h2>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="outline">{data.class}</Badge>
                  <Badge variant="outline">{data.exam}</Badge>
                  <Badge variant="outline">{data.language}</Badge>
                </div>
              </div>

              <div
                className="prose prose-sm max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(data.description),
                }}
              />
            </div>
          </div>

          {/* Course Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <BookOpen className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">
                {data.subjects?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Subjects</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <FileText className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">
                {data.chapters?.length || 0}
              </div>
              <div className="text-sm text-muted-foreground">Chapters</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Video className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{totalLectures}</div>
              <div className="text-sm text-muted-foreground">Lectures</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto text-primary mb-2" />
              <div className="text-2xl font-bold">{totalTopics}</div>
              <div className="text-sm text-muted-foreground">Topics</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Information */}
      {data.teacherId && (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Teacher</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src="/placeholder-teacher.jpg" />
                <AvatarFallback className="text-lg">
                  {getInitials("Teacher Name")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">Teacher Name</h3>
                <p className="text-muted-foreground">teacher@example.com</p>
                <div className="flex items-center space-x-4 mt-2 text-sm">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>1,250 students</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>8 courses</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Schedule & Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start Date:</span>
              <span>{formatDate(data.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End Date:</span>
              <span>{formatDate(data.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Validity:</span>
              <span>{data.validity || "Not set"}</span>
            </div>
          </CardContent>
        </Card>

        {showCoursePricing && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Price:</span>
              <span>{formatPrice(data.totalPrice || 0)}</span>
            </div>
            {data.discountPercentage > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="text-green-600">
                  -{data.discountPercentage}%
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg">
              <span>Final Price:</span>
              <span className="text-primary">
                {formatPrice(data.discountedPrice || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Subjects */}
      {data.subjects && data.subjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subjects ({data.subjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.subjects.map(
                (subject: {
                  id: string;
                  name: string;
                  description: string;
                  thumbnailUrl: string;
                  teacherId: string;
                }) => (
                  <div
                    key={subject.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    {subject.thumbnailUrl ? (
                      <Image
                        src={subject.thumbnailUrl}
                        alt={subject.name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-semibold">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {subject.description.replace(/<[^>]*>/g, "")}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapters & Topics */}
      {data.chapters && data.chapters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Course Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.chapters.map(
                (chapter: {
                  id: string;
                  name: string;
                  lectureCount: number;
                  lectureDuration: string;
                  topics: Array<{ id: string; name: string }>;
                }) => (
                  <div key={chapter.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{chapter.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{chapter.lectureCount} lectures</span>
                        <span>{chapter.lectureDuration}</span>
                      </div>
                    </div>
                    {chapter.topics && chapter.topics.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                        {chapter.topics.map(
                          (topic: { id: string; name: string }) => (
                            <div
                              key={topic.id}
                              className="flex items-center space-x-2 text-sm"
                            >
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                              <span>{topic.name}</span>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FAQ */}
      {data.faq && data.faq.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.faq.map(
                (faq: {
                  id: string;
                  question: string;
                  description: string;
                }) => (
                  <div key={faq.id} className="border-l-4 border-primary pl-4">
                    <h4 className="font-semibold mb-2">{faq.question}</h4>
                    <div
                      className="text-sm text-muted-foreground prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(faq.description),
                      }}
                    />
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">
                Course Ready for Publication
              </h3>
              <p className="text-sm text-green-600">
                All required information has been provided. Your course is ready
                to be published.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          onClick={handlePublish}
          disabled={isSubmitting || isPublishing}
          className="bg-green-600 hover:bg-green-700"
        >
          {isPublishing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Publishing...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Publish Course
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
