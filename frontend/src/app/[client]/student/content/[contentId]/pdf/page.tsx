"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ArrowLeft } from "lucide-react";
import { useGetClientContentsByTopic } from "@/hooks";

// Dynamically import PDFViewer with SSR disabled
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

interface Content {
  id: string;
  name: string;
  topicId: string;
  type: "Lecture" | "PDF";
  pdfUrl?: string;
  videoUrl?: string;
  videoType?: "YOUTUBE" | "HLS";
  videoThumbnail?: string;
  videoDuration?: number;
  isCompleted?: boolean;
  description?: string;
}

function PDFViewerContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contentId = params.contentId as string;
  const topicId = searchParams.get("topicId");
  const [content, setContent] = useState<Content | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch content when topicId is available
  const { data: contentsResponse, isLoading: isLoadingContents } =
    useGetClientContentsByTopic(topicId || "");

  useEffect(() => {
    if (contentsResponse?.data) {
      const contents: Content[] = Array.isArray(contentsResponse.data)
        ? contentsResponse.data
        : [];
      const foundContent = contents.find((c) => c.id === contentId);
      if (foundContent) {
        setContent(foundContent);
        setIsLoading(false);
      } else if (!isLoadingContents) {
        setIsLoading(false);
      }
    } else if (!isLoadingContents && !topicId) {
      setIsLoading(false);
    }
  }, [contentsResponse, contentId, isLoadingContents, topicId]);

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <LoadingSpinner text="Loading PDF..." />
      </div>
    );
  }

  if (!content || content.type !== "PDF" || !content.pdfUrl) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">PDF not found</h2>
            <p className="text-muted-foreground mb-6">
              The requested PDF content could not be found.
            </p>
            <Button onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 py-6">
      <Card className="h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl">{content.name}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-6">
          <div className="h-full">
            <PDFViewer
              fileUrl={content.pdfUrl}
              title={content.name}
              height="100%"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PDFViewerPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading PDF viewer..." />}>
      <PDFViewerContent />
    </Suspense>
  );
}

