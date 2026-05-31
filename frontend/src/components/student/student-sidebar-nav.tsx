"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Award,
  Calendar,
  TrendingUp,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgLogo, useOrgName } from "@/lib/store/organization-config";
import { useStudentNavigationItems } from "@/lib/constants/platform-features";
import type { LucideIcon } from "lucide-react";

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  BookOpen,
  Award,
  Calendar,
  TrendingUp,
  FileText,
};

export function StudentSidebarNav() {
  const pathname = usePathname();
  const navItems = useStudentNavigationItems();
  const orgLogo = useOrgLogo();
  const orgName = useOrgName();

  const navLinks = navItems.map((item) => ({
    href: item.href,
    label: item.title,
    icon: NAV_ICON_MAP[item.icon] ?? LayoutDashboard,
  }));

  const isActive = (href: string) => {
    if (!pathname) return false;
    const normalizedPath =
      pathname.replace(/^\/[^/]+(?=\/student)/, "") || pathname;
    if (href === "/student/my-learning") {
      return (
        normalizedPath === "/student/my-learning" ||
        normalizedPath === "/student/dashboard"
      );
    }
    if (href === "/student/explore") {
      return (
        normalizedPath.startsWith("/student/explore") ||
        normalizedPath.startsWith("/student/batches")
      );
    }
    return normalizedPath.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full py-4 px-3 gap-1">
      {/* Logo */}
      <Link
        href={navLinks[0]?.href ?? "/student/my-learning"}
        className="flex items-center gap-2.5 px-2 py-3 mb-2"
      >
        {orgLogo ? (
          <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-border/50 bg-background shrink-0">
            <Image
              src={orgLogo}
              alt={orgName}
              fill
              className="object-contain p-0.5"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
            {orgName?.charAt(0)?.toUpperCase() || "L"}
          </div>
        )}
        <span className="text-sm font-semibold text-foreground truncate">
          {orgName || "Learning Platform"}
        </span>
      </Link>

      {/* Nav links */}
      {navLinks.map((link) => {
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
