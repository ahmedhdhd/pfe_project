"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyCourseCheckoutRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    router.replace(`/student/checkout?courseId=${id}`);
  }, [id, router]);

  return null;
}
