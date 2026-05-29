import type { NavigationItem } from "@/lib/types";

/** Student top nav / mobile tabs — filtered by `featuresEnabled` at runtime. */
export const STUDENT_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: "My Learning",
    href: "/student/my-learning",
    icon: "LayoutDashboard",
    roles: ["student"],
  },
  {
    title: "Explore",
    href: "/student/explore",
    icon: "BookOpen",
    roles: ["student"],
  },
  {
    title: "Certificates",
    href: "/student/certificates",
    icon: "Award",
    roles: ["student"],
  },
  {
    title: "Live Sessions",
    href: "/student/live-sessions",
    icon: "Calendar",
    roles: ["student"],
  },
  {
    title: "My Profile",
    href: "/student/profile",
    icon: "TrendingUp",
    roles: ["student"],
  },
];
