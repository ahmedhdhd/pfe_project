"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Sparkles,
} from "@/components/icons";
import { tokenManager } from "@/lib/api/client";
import { useLogout } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/platform/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/platform/organizations", label: "Organisations", icon: Building2 },
  { href: "/platform/reports", label: "Reports", icon: FileWarning },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();

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
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-72 border-r border-slate-200 bg-white/90 backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-cyan-700">
            <Sparkles className="h-3.5 w-3.5" />
            Super Admin
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Tesla Platform</h1>
          <p className="mt-1 text-sm text-slate-500">
            Central command for organizations, reports, and platform health
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-all duration-200",
                  active
                    ? "bg-slate-900 text-white shadow-[0_0_0_1px_rgba(15,23,42,0.08)]"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition-colors",
                    active
                      ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                      : "border-slate-200 bg-slate-50 text-slate-500 group-hover:border-slate-300 group-hover:bg-white group-hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <Button
            variant="ghost"
            className="w-full justify-start rounded-2xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => logout.mutate()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

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
