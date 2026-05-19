"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetContentsByTopic } from "@/hooks";
import { FileText, Video } from "lucide-react";
import { ContentFilterTabs } from "@/components/common/content-filter-tabs";
import { EmptyStateCard } from "@/components/common/empty-state-card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  ModalContentCard,
  type Content,
} from "@/components/student/modal-content-card";
import { ContentCardShimmerGrid } from "@/components/student/content-card-shimmer";
import { formatDuration } from "@/lib/utils/format-duration";

interface Topic {
  id: string;
  name: string;
  chapterId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ViewTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic | null;
}

export function ViewTopicModal({
  isOpen,
  onClose,
  topic,
}: ViewTopicModalProps) {
  // Preserve topic while modal is open to avoid null issues
  const [preservedTopic, setPreservedTopic] = useState<Topic | null>(null);

  // Update preserved topic when topic prop changes
  useEffect(() => {
    if (topic) {
      setPreservedTopic(topic);
    }
  }, [topic]);

  // Clear preserved topic when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Delay clearing to allow modal close animation
      const timer = setTimeout(() => {
        setPreservedTopic(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Use topic prop if available, otherwise fall back to preserved topic
  // This ensures we have a topic even if it becomes null briefly
  const currentTopic = topic || preservedTopic;

  // Only fetch contents when we have a valid topic ID and modal is open
  const topicId = isOpen && currentTopic?.id ? currentTopic.id : "";
  const { data: contentsData, isLoading: contentsLoading } =
    useGetContentsByTopic(topicId);

  const contents = contentsData?.data || [];

  const lectures = contents.filter(
    (content: Content) => content.type === "Lecture" && content.videoUrl
  );
  const pdfs = contents.filter(
    (content: Content) => content.type === "PDF" && content.pdfUrl
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{currentTopic?.name || "View Topic"}</DialogTitle>
          <DialogDescription>
            View all lectures and PDFs associated with this topic
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {contentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : contents.length === 0 ? (
            <ContentCardShimmerGrid count={3} />
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ContentFilterTabs
                totalCount={contents.length}
                lecturesCount={lectures.length}
                pdfsCount={pdfs.length}
                label=""
                allContent={
                  <div className="grid grid-cols-1 gap-1">
                    {contents.map((content: Content) => (
                      <ModalContentCard
                        key={content.id}
                        content={{
                          ...content,
                          topicId: content.topicId || currentTopic?.id || "",
                        }}
                        formatDuration={formatDuration}
                      />
                    ))}
                  </div>
                }
                lecturesContent={
                  lectures.length === 0 ? (
                    <EmptyStateCard
                      icon={Video}
                      title="No lectures available"
                      description=""
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-1">
                      {lectures.map((content: Content) => (
                        <ModalContentCard
                          key={content.id}
                          content={{
                            ...content,
                            topicId: content.topicId || currentTopic?.id || "",
                          }}
                          formatDuration={formatDuration}
                        />
                      ))}
                    </div>
                  )
                }
                pdfsContent={
                  pdfs.length === 0 ? (
                    <EmptyStateCard
                      icon={FileText}
                      title="No PDFs available"
                      description=""
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-1">
                      {pdfs.map((content: Content) => (
                        <ModalContentCard
                          key={content.id}
                          content={{
                            ...content,
                            topicId: content.topicId || currentTopic?.id || "",
                          }}
                          formatDuration={formatDuration}
                        />
                      ))}
                    </div>
                  )
                }
                className="flex-1 flex flex-col overflow-hidden"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
