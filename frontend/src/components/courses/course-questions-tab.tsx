"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import apiClient from "@/lib/api/client";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CourseQuestionsTabProps {
  courseId: string;
}

export function CourseQuestionsTab({ courseId }: CourseQuestionsTabProps) {
  const queryClient = useQueryClient();
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState("");

  const {
    data: questionsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-questions", courseId],
    queryFn: () => apiClient.get(`/api/questions/batch/${courseId}`).then((res) => res.data),
    enabled: Boolean(courseId),
  });

  const createResponseMutation = useMutation({
    mutationFn: async (data: { questionId: string; content: string }) => {
      try {
        return await apiClient.post(`/admin/questions/${data.questionId}/responses`, {
          content: data.content,
        });
      } catch (err) {
        // Fallback to the shared endpoint (still checks enrollment for STUDENT role).
        return await apiClient.post(`/api/questions/${data.questionId}/responses`, {
          content: data.content,
        });
      }
    },
    onSuccess: () => {
      setResponseContent("");
      queryClient.invalidateQueries({ queryKey: ["admin-questions", courseId] });
    },
  });

  if (isLoading) {
    return <LoadingSpinner text="Loading questions..." />;
  }

  const questions = Array.isArray(questionsData?.data)
    ? questionsData.data
    : Array.isArray((questionsData as any)?.data?.questions)
    ? (questionsData as any).data.questions
    : [];

  if (isError) {
    const message =
      (error as any)?.response?.data?.message ||
      (error instanceof Error ? error.message : null) ||
      "Failed to load questions.";

    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Questions</CardTitle>
          <CardDescription>View and respond to student questions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Couldn’t load questions</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Questions</CardTitle>
        <CardDescription>View and respond to student questions.</CardDescription>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="text-center p-8 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-muted-foreground">No questions have been asked in this course yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q: any) => (
              <Card key={q.id} className="overflow-hidden border-border/50">
                <CardContent className="p-0">
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedQuestionId(expandedQuestionId === q.id ? null : q.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-semibold text-lg">{q.title || "Untitled Question"}</h5>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${q.status === 'ANSWERED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                        {q.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground line-clamp-2">{q.content}</p>
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{q.user?.username}</span>
                      <span>•</span>
                      <span>{format(new Date(q.createdAt), "PPP")}</span>
                      <span>•</span>
                      <span>{q.responses?.length || 0} replies</span>
                    </div>
                  </div>
                  
                  {expandedQuestionId === q.id && (
                    <div className="bg-muted/30 border-t p-4 space-y-6">
                      <div>
                        <h6 className="text-sm font-semibold mb-2">Full Question:</h6>
                        <div className="text-sm whitespace-pre-wrap bg-background p-4 rounded-md border">
                          {q.content}
                        </div>
                      </div>
                      
                      {/* Responses */}
                      {q.responses && q.responses.length > 0 && (
                        <div>
                          <h6 className="text-sm font-semibold mb-3">Thread:</h6>
                          <div className="space-y-3">
                            {q.responses.map((r: any) => (
                              <div key={r.id} className="bg-background rounded-md p-4 border flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{r.user?.username}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.user?.role === 'STUDENT' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                                    {r.user?.role}
                                  </span>
                                  <span className="text-xs text-muted-foreground ml-auto">{format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Reply Form */}
                      <div className="pt-4 border-t">
                        <h6 className="text-sm font-semibold mb-3">Your Response:</h6>
                        <div className="flex flex-col gap-3">
                          <Textarea 
                            placeholder="Type your official response..." 
                            value={responseContent}
                            onChange={(e) => setResponseContent(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <div className="flex justify-end">
                            <Button 
                              onClick={() => createResponseMutation.mutate({ questionId: q.id, content: responseContent })}
                              disabled={!responseContent.trim() || createResponseMutation.isPending}
                            >
                              Post Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
