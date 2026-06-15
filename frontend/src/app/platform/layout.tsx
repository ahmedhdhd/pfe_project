"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, FileWarning, LayoutDashboard, LogOut } from "lucide-react";
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
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-semibold">Tesla Platform</h1>
          <p className="text-xs text-slate-400 mt-1">Super Admin</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => logout.mutate()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
