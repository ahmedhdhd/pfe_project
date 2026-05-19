"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowRight,
  ArrowLeft,
  Search,
  User,
  Star,
  BookOpen,
} from "lucide-react";
import { decodeHtmlEntities } from "@/lib/utils";

interface Teacher {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
  highlights: string | { content: string };
  subjects: string[];
  rating: number;
  totalStudents: number;
  totalCourses: number;
}

interface TeacherSelectionData {
  teacherId: string;
}

interface TeacherSelectionStepProps {
  data: TeacherSelectionData;
  onUpdate: (data: Partial<TeacherSelectionData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isSubmitting: boolean;
}

export function TeacherSelectionStep({
  data,
  onUpdate,
  onNext,
  onPrevious,
  isFirstStep,
  isSubmitting,
}: TeacherSelectionStepProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    data.teacherId || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // const { errors, validateField, validateForm } = useEnhancedFormValidation();

  // Mock teachers data - in real app, this would come from API
  useEffect(() => {
    const mockTeachers: Teacher[] = [
      {
        id: "1",
        name: "Dr. Sarah Johnson",
        email: "sarah.johnson@example.com",
        imageUrl:
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        highlights:
          "Expert in Physics with 10+ years of experience. Specializes in JEE and NEET preparation.",
        subjects: ["Physics", "Mathematics"],
        rating: 4.8,
        totalStudents: 1250,
        totalCourses: 8,
      },
      {
        id: "2",
        name: "Prof. Michael Chen",
        email: "michael.chen@example.com",
        imageUrl:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        highlights:
          "Mathematics expert with PhD from MIT. Known for simplifying complex concepts.",
        subjects: ["Mathematics", "Statistics"],
        rating: 4.9,
        totalStudents: 2100,
        totalCourses: 12,
      },
      {
        id: "3",
        name: "Dr. Priya Sharma",
        email: "priya.sharma@example.com",
        imageUrl:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        highlights:
          "Chemistry specialist with extensive research background. Focuses on conceptual understanding.",
        subjects: ["Chemistry", "Organic Chemistry"],
        rating: 4.7,
        totalStudents: 1800,
        totalCourses: 6,
      },
      {
        id: "4",
        name: "Mr. Rajesh Kumar",
        email: "rajesh.kumar@example.com",
        imageUrl:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        highlights:
          "Biology expert with 15+ years of teaching experience. Specializes in NEET preparation.",
        subjects: ["Biology", "Botany", "Zoology"],
        rating: 4.6,
        totalStudents: 3200,
        totalCourses: 15,
      },
    ];

    // Simulate API call
    setTimeout(() => {
      setTeachers(mockTeachers);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.subjects.some((subject) =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacher(teacherId);
    onUpdate({ teacherId });
  };

  const handleNext = () => {
    if (selectedTeacher) {
      onNext();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter((n) => n.length > 0)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Select Teacher</CardTitle>
          <CardDescription>
            Choose a teacher to assign to this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search teachers by name or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Teachers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTeachers.map((teacher) => (
          <Card
            key={teacher.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedTeacher === teacher.id
                ? "ring-2 ring-primary border-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => handleTeacherSelect(teacher.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={teacher.imageUrl} alt={teacher.name} />
                  <AvatarFallback className="text-lg">
                    {getInitials(teacher.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{teacher.name}</h3>
                    {selectedTeacher === teacher.id && (
                      <Badge variant="default" className="bg-green-600">
                        Selected
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {teacher.email}
                  </p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="font-medium">{teacher.rating}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4 text-blue-500" />
                        <span>
                          {teacher.totalStudents.toLocaleString()} students
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <BookOpen className="h-4 w-4 text-green-500" />
                        <span>{teacher.totalCourses} courses</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjects.map((subject) => (
                        <Badge
                          key={subject}
                          variant="secondary"
                          className="text-xs"
                        >
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div
                      className="prose prose-sm max-w-none line-clamp-4 text-muted-foreground [&_p]:m-0 [&_p]:mb-1 [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-1 [&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-1 [&_li]:mb-0.5 [&_li]:text-xs [&_li]:leading-tight"
                      dangerouslySetInnerHTML={{
                        __html: decodeHtmlEntities(
                          typeof teacher.highlights === "string"
                            ? teacher.highlights
                            : teacher.highlights?.content || ""
                        ),
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeachers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No teachers found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or contact support to add
              teachers.
            </p>
          </CardContent>
        </Card>
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
          disabled={isSubmitting || !selectedTeacher}
        >
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
