"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export default function LegacyContentPlayerRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const chapterId = params.chapterId as string;
  const topicId = params.topicId as string;
  const contentId = params.contentId as string;

  useEffect(() => {
    router.replace(
      `/student/batches/${batchId}/chapters/${chapterId}/topics/${topicId}/content/${contentId}`
    );
  }, [batchId, chapterId, contentId, router, topicId]);

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <LoadingSpinner text="Redirecting to lesson..." />
    </div>
  );
}
