"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks";
import { ROLES } from "@/lib/constants";

export function AdminOnboardingGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const [ready, setReady] = useState(false);

  const isOnboardingRoute = pathname?.startsWith("/admin/onboarding");

  useEffect(() => {
    if (isLoading) return;

    const role = user?.role?.toLowerCase();
    const needsOnboarding =
      role === ROLES.ADMIN && user?.hasCompletedOnboarding === false;

    if (needsOnboarding && !isOnboardingRoute) {
      router.replace("/admin/onboarding");
      return;
    }

    setReady(true);
  }, [user, isLoading, isOnboardingRoute, router]);

  if (isLoading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
