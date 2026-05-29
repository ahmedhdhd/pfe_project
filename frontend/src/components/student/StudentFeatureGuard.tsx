"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  getDefaultStudentRoute,
  getStudentPathFeature,
  isFeatureEnabled,
  normalizeStudentPath,
  useOrgFeaturesEnabled,
} from "@/lib/constants/platform-features";

export function StudentFeatureGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const featuresEnabled = useOrgFeaturesEnabled();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const normalized = normalizeStudentPath(pathname);
    const featureKey = getStudentPathFeature(normalized);

    if (featureKey && !isFeatureEnabled(featuresEnabled, featureKey)) {
      const fallback = getDefaultStudentRoute(featuresEnabled);
      router.replace(fallback);
      return;
    }

    setReady(true);
  }, [pathname, featuresEnabled, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
