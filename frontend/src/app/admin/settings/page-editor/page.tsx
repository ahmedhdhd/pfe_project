"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "@/components/icons";

// The page editor now lives inside Settings as the "Website" tab.
export default function PageEditorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/settings?tab=website");
  }, [router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
