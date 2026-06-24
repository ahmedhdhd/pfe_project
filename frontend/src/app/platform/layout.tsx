"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenManager } from "@/lib/api/client";
import { Sidebar } from "@/components/common/sidebar";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!tokenManager.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const user = tokenManager.getUser();
    if (user?.role !== "SUPER_ADMIN") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="relative flex-1 overflow-auto">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-8rem] top-[-8rem] h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute right-[-6rem] top-[18rem] h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        </div>
        <div className="relative p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
