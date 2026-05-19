"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  UserCog,
  Settings,
  CreditCard,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  Building2,
  FileText,
  Award,
  Library,
  LogOut,
  Megaphone,
  GraduationCap,
  Shapes,
  UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/store";
import { getNavigationItems, ROLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useLogout } from "@/hooks";
import {
  Sidebar as UISidebar,
  SidebarBody,
  useSidebar,
} from "@/components/ui/sidebar";

const iconMap = {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  UserCog,
  Settings,
  CreditCard,
  TrendingUp,
  Calendar,
  Building2,
  FileText,
  Award,
  Library,
  Megaphone,
  GraduationCap,
  Shapes,
};

interface SidebarProps {
  className?: string;
}

// Custom SidebarLink wrapper that handles Next.js Link
function CustomSidebarLink({
  link,
  className,
  isActive,
}: {
  link: {
    label: string;
    href: string;
    icon: React.ReactNode;
  };
  className?: string;
  isActive?: boolean;
}) {
  const { open: sidebarOpen } = useSidebar();

  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-between w-full group/sidebar py-2 rounded-md transition-colors",
        "px-2", // Consistent padding for all items
        isActive && "bg-accent text-accent-foreground",
        !isActive && "hover:bg-accent",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="shrink-0 w-5 h-5 flex items-center justify-center">
          {link.icon}
        </span>
        <motion.span
          animate={{
            display: sidebarOpen ? "inline-block" : "none",
            opacity: sidebarOpen ? 1 : 0,
            width: sidebarOpen ? "auto" : 0,
          }}
          className="text-neutral-700 dark:text-neutral-200 text-sm whitespace-nowrap overflow-hidden"
        >
          {link.label}
        </motion.span>
      </div>
    </Link>
  );
}

function SidebarContent({ className }: { className?: string }) {
  const pathname = usePathname();
  const role = useRole();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hostname, setHostname] = useState("");
  const { open: sidebarOpen } = useSidebar();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const logoutMutation = useLogout();

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemTitle)
        ? prev.filter((item) => item !== itemTitle)
        : [...prev, itemTitle]
    );
  };

  // Get navigation items based on current domain and role
  const effectiveRole = role || user?.role || ROLES.STUDENT;
  const filteredItems = getNavigationItems(hostname, effectiveRole);

  const isActive = (href: string) => {
    // Normalize: remove client segment if present (e.g., /mit/student/dashboard -> /student/dashboard)
    const normalizedPath =
      pathname.replace(/^\/[^/]+(?=\/student)/, "") || pathname;

    if (href === "/dashboard") {
      return (
        normalizedPath === "/admin/dashboard" ||
        normalizedPath === "/teacher/dashboard" ||
        normalizedPath === "/student/dashboard"
      );
    }
    // Handle Explore route - include test-series and batches detail pages
    if (href === "/student/explore") {
      return (
        normalizedPath.startsWith("/student/explore") ||
        normalizedPath.startsWith("/student/batches")
      );
    }
    // Handle exact matches for admin routes
    if (href === "/admin/users") {
      return normalizedPath === "/admin/users";
    }
    if (href === "/admin/courses") {
      return normalizedPath === "/admin/courses";
    }
    if (href === "/admin/analytics") {
      return normalizedPath === "/admin/analytics";
    }
    if (href === "/admin/clients") {
      return normalizedPath === "/admin/clients";
    }
    if (href === "/admin/settings") {
      return normalizedPath === "/admin/settings";
    }
    if (href === "/admin/billing") {
      return normalizedPath === "/admin/billing";
    }
    if (href === "/admin/assignments") {
      return normalizedPath.startsWith("/admin/assignments");
    }
    if (href === "/teacher/assignments") {
      return normalizedPath.startsWith("/teacher/assignments");
    }
    return normalizedPath.startsWith(href);
  };
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Convert navigation items to sidebar links format
  const convertToSidebarLinks = () => {
    return filteredItems.map((item) => {
      const Icon = iconMap[item.icon as keyof typeof iconMap] || BookOpen;
      const isItemActive = isActive(item.href);
      const hasChildren = item.children && item.children.length > 0;

      return {
        ...item,
        icon: (
          <Icon className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
        ),
        isActive: isItemActive,
        hasChildren,
      };
    });
  };

  const sidebarLinks = convertToSidebarLinks();

  return (
    <SidebarBody className={cn("justify-between border-r bg-card", className)}>
      <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto min-h-0">
        {/* Welcome Section */}
        <div className="mb-4 pb-4 border-b">
          <div className="flex items-center gap-3 px-2 min-w-0">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <UserIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <motion.div
              animate={{
                display: sidebarOpen ? "block" : "none",
                opacity: sidebarOpen ? 1 : 0,
                width: sidebarOpen ? "auto" : 0,
              }}
              className="flex-1 min-w-0 max-w-full overflow-hidden"
            >
              <p className="text-xs text-muted-foreground leading-none mb-0.5 truncate">
                Welcome back,
              </p>
              <p className="text-sm font-medium truncate leading-tight max-w-full">
                {userLoading
                  ? "Loading..."
                  : user?.username ||
                    (role === "admin"
                      ? "Admin"
                      : role === "teacher"
                      ? "Teacher"
                      : "Student")}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-0.5 px-1">
          {sidebarLinks?.map((item) => {
            const link = {
              label: item.title,
              href: item.href,
              icon: item.icon,
            };

            if (item.hasChildren) {
              const isExpanded = expandedItems.includes(item.title);
              return (
                <div key={item.title}>
                  <div
                    className={cn(
                      "flex items-center justify-between w-full group/sidebar py-2 cursor-pointer rounded-md transition-colors",
                      "px-2", // Consistent padding matching other items
                      item.isActive && "bg-accent text-accent-foreground",
                      !item.isActive && "hover:bg-accent"
                    )}
                    onClick={() => toggleExpanded(item.title)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                        {link.icon}
                      </span>
                      <motion.span
                        animate={{
                          display: sidebarOpen ? "inline-block" : "none",
                          opacity: sidebarOpen ? 1 : 0,
                          width: sidebarOpen ? "auto" : 0,
                        }}
                        className="text-neutral-700 dark:text-neutral-200 text-sm whitespace-nowrap overflow-hidden"
                      >
                        {link.label}
                      </motion.span>
                    </div>
                    <motion.div
                      animate={{
                        display: sidebarOpen ? "inline-block" : "none",
                        opacity: sidebarOpen ? 1 : 0,
                        width: sidebarOpen ? "auto" : 0,
                      }}
                      className="shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </motion.div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && sidebarOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-7 mt-1 space-y-0.5"
                      >
                        {item.children!.map((child) => {
                          const ChildIcon =
                            iconMap[child.icon as keyof typeof iconMap] ||
                            BookOpen;
                          const isChildActive = isActive(child.href);
                          const childLink = {
                            label: child.title,
                            href: child.href,
                            icon: (
                              <ChildIcon className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
                            ),
                          };

                          return (
                            <CustomSidebarLink
                              key={child.title}
                              link={childLink}
                              isActive={isChildActive}
                              className="text-sm"
                            />
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <CustomSidebarLink
                key={item.title}
                link={link}
                isActive={item.isActive}
              />
            );
          })}
        </nav>
      </div>

      {/* Logout Section */}
      <div className="border-t pt-2 mt-auto">
        <Button
          variant="ghost"
          onClick={handleLogout}
          size="sm"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-9"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <motion.span
            animate={{
              display: sidebarOpen ? "inline-block" : "none",
              opacity: sidebarOpen ? 1 : 0,
              width: sidebarOpen ? "auto" : 0,
            }}
            className="ml-2 whitespace-nowrap overflow-hidden"
          >
            Log out
          </motion.span>
        </Button>
      </div>
    </SidebarBody>
  );
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <UISidebar>
      <SidebarContent className={className} />
    </UISidebar>
  );
}
