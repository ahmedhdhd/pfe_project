"use client";

import { useState } from "react";
import {
  Bell,
  BookOpen,
  LayoutTemplate,
  MessageSquare,
  NotebookPen,
  Star,
} from "@/components/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCreateBatchReview } from "@/hooks";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { PremiumTabsTrigger } from "@/components/common/premium-tabs-trigger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ChapterList } from "./chapter-list";
import { Course, CourseContent, Chapter } from "./types";
import apiClient from "@/lib/api/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { stripHtmlToText } from "@/lib/utils";
import DOMPurify from "dompurify";

const isRichTextEmpty = (html: string) => {
  const stripped = html
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return stripped.length === 0;
};

interface CoursePlayerTabsProps {
  course: Course;
  courseId: string;
  chapters: Chapter[];
  onContentSelect: (content: CourseContent) => void;
}

export function CoursePlayerTabs({
  course,
  courseId,
  chapters,
  onContentSelect,
}: CoursePlayerTabsProps) {
  const [activeTab, setActiveTab] = useState("content");
  const queryClient = useQueryClient();

  // Notes state
  const [noteContent, setNoteContent] = useState("");
  
  // Question state
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionContent, setQuestionContent] = useState("");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState("");

  // Review state
  const createReviewMutation = useCreateBatchReview();
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Queries
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ["notes", courseId],
    queryFn: () => apiClient.get(`/api/notes/batch/${courseId}`).then((res) => res.data),
    enabled: activeTab === "notes",
  });

  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ["questions", courseId],
    queryFn: () => apiClient.get(`/api/questions/batch/${courseId}`).then((res) => res.data),
    enabled: activeTab === "questions",
  });

  const { data: announcementsData } = useQuery({
    queryKey: ["announcements", courseId],
    queryFn: () =>
      apiClient
        .get(`/api/announcements`, { params: { batchId: courseId } })
        .then((res) => res.data),
    enabled: activeTab === "announcements",
  });

  // Mutations
  const createNoteMutation = useMutation({
    mutationFn: (content: string) => apiClient.post(`/api/notes/batch/${courseId}`, { content }),
    onSuccess: () => {
      setNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["notes", courseId] });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: (data: { title: string; content: string }) => apiClient.post(`/api/questions/batch/${courseId}`, data),
    onSuccess: () => {
      setQuestionTitle("");
      setQuestionContent("");
      queryClient.invalidateQueries({ queryKey: ["questions", courseId] });
    },
  });

  const createResponseMutation = useMutation({
    mutationFn: (data: { questionId: string; content: string }) => apiClient.post(`/api/questions/${data.questionId}/responses`, { content: data.content }),
    onSuccess: () => {
      setResponseContent("");
      queryClient.invalidateQueries({ queryKey: ["questions", courseId] });
    },
  });

  const notes = notesData?.data || [];
  const questions = questionsData?.data || [];
  const announcements = announcementsData?.data || [];

  const courseReviews = (course.reviews as Array<{ rating?: number }>) || [];
  const ratedReviews = courseReviews.filter(
    (review) => typeof review.rating === "number" && review.rating > 0
  );
  const averageRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, review) => sum + (review.rating || 0), 0) /
        ratedReviews.length
      : null;

  return (
    <div className="mt-6 w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex h-11 w-full items-center justify-start gap-2 rounded-lg bg-transparent p-0 border-b border-border/60 overflow-x-auto">
          <PremiumTabsTrigger value="content" icon={BookOpen} mobileLabel="Content">
            Course Content
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="presentation" icon={LayoutTemplate} mobileLabel="Info">
            Presentation
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="notes" icon={NotebookPen} mobileLabel="Notes">
            My Notes
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="announcements" icon={Bell} mobileLabel="News">
            Announcements
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="questions" icon={MessageSquare} mobileLabel="Q&A">
            Q&A
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="evaluation" icon={Star} mobileLabel="Reviews">
            Evaluation
          </PremiumTabsTrigger>
        </TabsList>

        <div className="mt-5 rounded-2xl border border-border/60 bg-background p-6 shadow-sm min-h-[400px]">
          {/* Content Tab */}
          <TabsContent value="content" className="m-0 focus-visible:outline-none">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-tight">Course Structure</h3>
              <p className="text-xs text-muted-foreground">Chapters, topics, and lessons</p>
            </div>
            <ChapterList chapters={chapters} onContentSelect={onContentSelect} />
          </TabsContent>

          {/* Presentation Tab */}
          <TabsContent value="presentation" className="m-0 space-y-6 focus-visible:outline-none">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                {course.title || "Course Details"}
              </h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground mb-4">
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1">
                  <Star className="h-4 w-4 text-amber-500" />
                  {averageRating !== null ? (
                    <>
                      <span className="font-medium text-foreground">
                        {averageRating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        avg rating ({ratedReviews.length})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">No ratings yet</span>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1">
                  <span className="font-medium text-foreground">
                    {(course.enrollments as any[])?.length || 0}
                  </span>
                  <span>students</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1">
                  <span className="font-medium text-foreground">Language</span>
                  <span>{(course.language as string) || "English"}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1">
                  <span className="font-medium text-foreground">Updated</span>
                  <span>
                    {course.updatedAt
                      ? format(new Date(course.updatedAt as string), "PPP")
                      : "Recently"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <div
                className="prose dark:prose-invert max-w-none text-muted-foreground"
              >
                {course.description
                  ? stripHtmlToText(course.description as string)
                  : "No description provided."}
              </div>
            </div>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="m-0 space-y-6 focus-visible:outline-none">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">My Notes</h3>
              <RichTextEditor
                content={noteContent}
                onChange={setNoteContent}
                placeholder="Write your notes..."
                className="prose-sm sm:prose-sm lg:prose-sm xl:prose-sm max-w-none"
              />
              <Button 
                onClick={() => createNoteMutation.mutate(noteContent)}
                disabled={isRichTextEmpty(noteContent) || createNoteMutation.isPending}
              >
                Save Note
              </Button>
            </div>

            <div className="space-y-4 mt-8">
              <h4 className="font-medium text-muted-foreground uppercase text-xs tracking-wider">Past Notes</h4>
              {notesLoading ? (
                <p className="text-sm text-muted-foreground">Loading notes...</p>
              ) : notes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">You haven't added any notes yet.</p>
              ) : (
                notes.map((note: any) => (
                  <Card key={note.id}>
                    <CardContent className="p-4">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(String(note.content || "")),
                        }}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.createdAt), "PPP p")}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements" className="m-0 space-y-6 focus-visible:outline-none">
            <h3 className="text-lg font-semibold">Announcements</h3>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No announcements for this course.</p>
            ) : (
              announcements.map((announcement: any) => (
                <Card key={announcement.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{announcement.subject}</CardTitle>
                    <CardDescription>{format(new Date(announcement.createdAt), "PPP")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose dark:prose-invert max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: announcement.contentHtml }}
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="m-0 space-y-6 focus-visible:outline-none">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Ask a Question</h3>
              <Input 
                placeholder="Question Title" 
                value={questionTitle}
                onChange={(e) => setQuestionTitle(e.target.value)}
              />
              <Textarea 
                placeholder="Describe your question in detail..." 
                value={questionContent}
                onChange={(e) => setQuestionContent(e.target.value)}
                className="min-h-[100px]"
              />
              <Button 
                onClick={() => createQuestionMutation.mutate({ title: questionTitle, content: questionContent })}
                disabled={!questionContent.trim() || createQuestionMutation.isPending}
              >
                Post Question
              </Button>
            </div>

            <div className="space-y-4 mt-8">
              <h4 className="font-medium text-muted-foreground uppercase text-xs tracking-wider">All Questions</h4>
              {questionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading questions...</p>
              ) : questions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No questions asked yet. Be the first!</p>
              ) : (
                questions.map((q: any) => (
                  <Card key={q.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div 
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-semibold">{q.title || "Untitled Question"}</h5>
                          <span className={`text-xs px-2 py-1 rounded-full ${q.status === 'ANSWERED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                            {q.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{q.content}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{q.user?.username}</span>
                          <span>•</span>
                          <span>{format(new Date(q.createdAt), "PPP")}</span>
                          <span>•</span>
                          <span>{q.responses?.length || 0} replies</span>
                        </div>
                      </div>
                      
                      {expandedQuestionId === q.id && (
                        <div className="bg-muted/30 border-t p-4 space-y-4">
                          <div className="text-sm whitespace-pre-wrap">{q.content}</div>
                          
                          {/* Responses */}
                          <div className="pl-4 border-l-2 space-y-4 mt-4">
                            {q.responses?.map((r: any) => (
                              <div key={r.id} className="bg-background rounded-md p-3 border">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-sm">{r.user?.username}</span>
                                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{r.user?.role}</span>
                                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(r.createdAt), "MMM d, h:mm a")}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                              </div>
                            ))}
                          </div>
                          
                          {/* Reply Form */}
                          <div className="mt-4 pt-4 border-t flex gap-2">
                            <Input 
                              placeholder="Type a reply..." 
                              value={responseContent}
                              onChange={(e) => setResponseContent(e.target.value)}
                            />
                            <Button 
                              size="sm"
                              onClick={() => createResponseMutation.mutate({ questionId: q.id, content: responseContent })}
                              disabled={!responseContent.trim() || createResponseMutation.isPending}
                            >
                              Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Evaluation Tab */}
          <TabsContent value="evaluation" className="m-0 space-y-6 focus-visible:outline-none">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-2">Write a Review</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="focus:outline-none hover:scale-110 transition-transform"
                      >
                        <Star
                          className={cn(
                            "w-8 h-8",
                            rating >= star ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your experience with this course..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                  <Button 
                    onClick={() => createReviewMutation.mutate(
                      { batchId: courseId, rating, comment: reviewComment },
                      { onSuccess: () => setReviewComment("") }
                    )}
                    disabled={createReviewMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Submit Review
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Student Reviews</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(course.reviews as any[])?.length > 0 ? (
                    (course.reviews as any[]).map((review) => (
                      <div key={review.id} className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary text-xs">
                            {(review.user?.username || "Student").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-sm">{review.user?.username || "Student"}</span>
                            <div className="text-[10px] text-muted-foreground">
                              {review.updatedAt ? format(new Date(review.updatedAt), "PPP") : "Recently"}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 ml-auto">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-3.5 h-3.5",
                                  i < review.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 bg-muted/30 rounded-xl border border-dashed border-border/50">
                      <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">No reviews yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
