"use client";

import { useParams, useSearchParams } from "next/navigation";
import { PlaygroundGeneratorPage } from "@/components/common/playground-generator-page";

export default function AdminCoursePlaygroundsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  return (
    <PlaygroundGeneratorPage
      basePath="admin"
      batchId={params.id as string}
      topicId={searchParams.get("topicId") ?? undefined}
      contentId={searchParams.get("contentId") ?? undefined}
      initialConcept={
        searchParams.get("contentName") ??
        searchParams.get("topicName") ??
        ""
      }
      initialInstruction={searchParams.get("instruction") ?? ""}
      existingPlaygroundId={searchParams.get("playgroundId")}
      contextLabel={
        searchParams.get("contentName") ??
        searchParams.get("topicName") ??
        undefined
      }
    />
  );
}
