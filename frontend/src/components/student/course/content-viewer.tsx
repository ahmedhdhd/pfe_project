"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiPlaygroundFrame } from "@/components/common/ai-playground-frame";
import { UnifiedVideoPlayer } from "@/components/common/unified-video-player";
import { CourseContent } from "./types";
import { getVideoMimeType } from "./utils";

// Dynamically import PDFViewer with SSR disabled to avoid canvas issues
const PDFViewer = dynamic(
  () =>
    import("@/components/common/pdf-viewer").then((mod) => ({
      default: mod.PDFViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-muted-foreground">
        Loading PDF viewer...
      </div>
    ),
  }
);

interface ContentViewerProps {
  content: CourseContent;
  onBack: () => void;
}

export function ContentViewer({ content, onBack }: ContentViewerProps) {
  const renderContent = () => {
    if (content.type === "Video" || content.type === "Lecture") {
      if (content.videoUrl) {
        return (
          <UnifiedVideoPlayer
            src={content.videoUrl}
            poster={content.videoThumbnail}
            type={getVideoMimeType(content.videoType, content.videoUrl)}
            className="w-full"
          />
        );
      }
    }

    if (content.type === "PDF") {
      if (content.pdfUrl) {
        return (
          <PDFViewer
            fileUrl={content.pdfUrl}
            title={content.name}
            height="600px"
          />
        );
      }
    }

    if (content.type === "PLAYGROUND") {
      return (
        <AiPlaygroundFrame
          playgroundId={content.playgroundId}
          title={content.name}
          className="mx-auto max-w-5xl"
          minHeightClassName="min-h-[600px]"
        />
      );
    }

    return (
      <div className="p-8 text-center text-muted-foreground">
        No content available to display.
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{content.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to Course
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{renderContent()}</CardContent>
    </Card>
  );
}
