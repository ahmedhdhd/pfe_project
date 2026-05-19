"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  FileText,
  Calendar,
  Award,
  ClipboardList,
  Library,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDENT_NAVIGATION_ITEMS } from "@/lib/constants";

// Extended navigation item type with optional badge
interface NavigationItemWithBadge {
  title: string;
  href: string;
  icon: string;
  badge?: number | boolean; // Number for count, boolean for dot indicator
}

const iconMap = {
  LayoutDashboard: LayoutDashboard,
  BookOpen: BookOpen,
  TrendingUp: TrendingUp,
  FileText: FileText,
  Library: Library,
  Megaphone: Megaphone,
  Calendar: Calendar,
  Award: Award,
};

// Special handling for Assignments - using ClipboardList icon
const getIcon = (iconName: string, title: string) => {
  if (title === "Assignments") {
    return ClipboardList;
  }
  return iconMap[iconName as keyof typeof iconMap] || FileText;
};

interface MobileBottomTabsProps {
  badges?: Record<string, number | boolean>; // Map of href to badge value
  isLoading?: boolean;
}

export function MobileBottomTabs({
  badges = {},
  isLoading = false,
}: MobileBottomTabsProps) {
  const pathname = usePathname();

  // Active route detection function
  const isActive = (href: string) => {
    if (!pathname) return false;

    // Normalize: remove client segment if present (e.g., /mit/student/dashboard -> /student/dashboard)
    const normalizedPath =
      pathname.replace(/^\/[^/]+(?=\/student)/, "") || pathname;

    // Handle exact match for dashboard
    if (href === "/student/dashboard") {
      return (
        normalizedPath === "/student/dashboard" ||
        normalizedPath === "/dashboard"
      );
    }

    // Exact match - highest priority
    if (normalizedPath === href) {
      return true;
    }

    // Check if path is a sub-route of href (e.g., /student/explore/batches)
    // Must start with href followed by a forward slash to avoid partial matches
    // This prevents /student/my-learning from matching /student/my-learning-explore
    if (normalizedPath.startsWith(href)) {
      const nextChar = normalizedPath[href.length];
      // Only match if next character is a slash (sub-route) or end of string
      return nextChar === "/" || nextChar === undefined;
    }

    return false;
  };

  // Filter navigation items - UX best practice: 4-5 items max for optimal usability
  // Prioritize: Dashboard, Batches, Progress, Tests, Grades
  const navItems = STUDENT_NAVIGATION_ITEMS.slice(0, 5).map((item) => ({
    ...item,
    badge: badges[item.href],
  })); // Reduced from 7 to 5 for better UX

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    // Normalize paths for comparison
    const normalizedPath =
      pathname?.replace(/^\/[^/]+(?=\/student)/, "") || pathname;
    const normalizedHref = href.replace(/^\/[^/]+(?=\/student)/, "");

    // Only scroll if we're navigating to a different route
    if (
      normalizedPath !== normalizedHref &&
      !normalizedPath?.startsWith(normalizedHref + "/")
    ) {
      // Scroll to top when navigating to a new route
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
      }, 50);
    }
  };

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "border-t border-border bg-background/95 backdrop-blur",
        "flex items-center justify-around",
        "px-1 py-1",
        "md:hidden",
        "overflow-hidden"
      )}
      style={{
        paddingBottom:
          "max(0.5rem, calc(0.5rem + env(safe-area-inset-bottom)))",
        paddingTop: "0.5rem",
      }}
    >
      {/* Loading skeleton */}
      {isLoading ? (
        <div className="flex items-center justify-around w-full px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="w-12 h-2 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        navItems.map((item, index) => {
          const Icon = getIcon(item.icon, item.title);
          const active = isActive(item.href);

          return (
            <div key={item.href} className="flex-1 min-w-0">
              <Link
                href={item.href}
                onClick={(e) => handleClick(e, item.href)}
                className={cn(
                  "relative flex flex-col items-center justify-center",
                  "min-w-0 w-full px-2 py-2",
                  "min-h-[44px] rounded-md",
                  "touch-manipulation select-none",
                  "overflow-hidden",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  active && "bg-muted"
                )}
                aria-label={item.title}
                aria-current={active ? "page" : undefined}
              >
                <div
                  className={cn(
                    "relative flex items-center justify-center",
                    "mb-1 h-8 w-8 rounded-md",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-center relative z-10">
                    <Icon
                      className={cn(
                        "h-5 w-5",
                        active ? "text-primary" : "text-muted-foreground",
                        "relative z-10"
                      )}
                      strokeWidth={active ? 2.5 : 2}
                      aria-hidden="true" // Icon is decorative, label provides context
                    />
                  </div>

                  {/* Badge/Notification indicator */}
                  {item.badge !== undefined && item.badge !== false && (
                    <div
                      className={cn(
                        "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                        "rounded-full bg-destructive text-destructive-foreground",
                        "text-[10px] font-bold leading-none",
                        typeof item.badge === "number" && item.badge > 0
                          ? "min-w-[18px] h-[18px] px-1"
                          : "w-2 h-2"
                      )}
                      aria-label={
                        typeof item.badge === "number"
                          ? `${item.badge} notifications`
                          : "New notification"
                      }
                    >
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className="px-0.5">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium leading-tight",
                    "px-0.5",
                    "relative z-10",
                    "overflow-hidden text-ellipsis whitespace-nowrap",
                    "max-w-full",
                    active
                      ? "text-primary font-semibold"
                      : "text-muted-foreground"
                  )}
                  style={{
                    maxWidth: "calc((100vw - 2rem) / 5 - 0.5rem)",
                  }}
                  title={item.title}
                >
                  {item.title}
                </span>
              </Link>
            </div>
          );
        })
      )}
    </nav>
  );
}
