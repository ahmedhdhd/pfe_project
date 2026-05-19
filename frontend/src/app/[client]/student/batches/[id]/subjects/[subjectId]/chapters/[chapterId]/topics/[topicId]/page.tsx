"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/common/loading-spinner";

export default function TopicDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  useEffect(() => {
    router.replace(`/student/batches/${batchId}`);
  }, [batchId, router]);

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <LoadingSpinner text="Redirecting to course details..." />
    </div>
  );
}
