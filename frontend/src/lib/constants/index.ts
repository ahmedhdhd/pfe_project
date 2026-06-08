import { NavigationItem } from "@/lib/types";

export const ROLES = {
  ADMIN: "admin" as const,
  TEACHER: "teacher" as const,
  STUDENT: "student" as const,
} as const;

// Admin navigation items (main domain)
export const ADMIN_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: "LayoutDashboard",
    roles: ["admin"],
  },
  {
    title: "Manage Users",
    href: "/admin/users",
    icon: "UserCog",
    roles: ["admin"],
  },
  {
    title: "Teachers",
    href: "/admin/teachers",
    icon: "GraduationCap",
    roles: ["admin"],
  },
  {
    title: "All Courses",
    href: "/admin/courses",
    icon: "BookOpen",
    roles: ["admin"],
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: "Shapes",
    roles: ["admin"],
  },
  {
    title: "Announcements",
    href: "/admin/announcements",
    icon: "Megaphone",
    roles: ["admin"],
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: "CreditCard",
    roles: ["admin"],
  },
  {
    title: "Live Sessions",
    href: "/admin/live-sessions",
    icon: "Calendar",
    roles: ["admin"],
  },
  {
    title: "Assignments",
    href: "/admin/assignments",
    icon: "FileText",
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: "Settings",
    roles: ["admin"],
  },
  {
    title: "Page Editor",
    href: "/admin/settings/page-editor",
    icon: "Layout",
    roles: ["admin"],
  },
];

// Teacher navigation items (main domain)
export const TEACHER_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/teacher/dashboard",
    icon: "LayoutDashboard",
    roles: ["teacher"],
  },
  {
    title: "My Courses",
    href: "/teacher/courses",
    icon: "BookOpen",
    roles: ["teacher"],
  },
  {
    title: "Categories",
    href: "/teacher/categories",
    icon: "Shapes",
    roles: ["teacher"],
  },
  {
    title: "Announcements",
    href: "/teacher/announcements",
    icon: "Megaphone",
    roles: ["teacher"],
  },
  {
    title: "Live Sessions",
    href: "/teacher/live-sessions",
    icon: "Calendar",
    roles: ["teacher"],
  },
  {
    title: "Assignments",
    href: "/teacher/assignments",
    icon: "FileText",
    roles: ["teacher"],
  },
  {
    title: "Students",
    href: "/teacher/students",
    icon: "Users",
    roles: ["teacher"],
  },
];

// Student navigation items (subdomain)
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
  // {
  //   title: "Tests",
  //   href: "/student/tests",
  //   icon: "FileText",
  //   roles: ["student"],
  // },
  // {
  //   title: "Assignments",
  //   href: "/student/assignments",
  //   icon: "FileText",
  //   roles: ["student"],
  // },
  // {
  //   title: "Upcoming Classes",
  //   href: "/student/classes",
  //   icon: "Calendar",
  //   roles: ["student"],
  // },
  // {
  //   title: "Grades",
  //   href: "/student/grades",
  //   icon: "Award",
  //   roles: ["student"],
  // },
];

// Legacy navigation items for backward compatibility
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Students",
    href: "/students",
    icon: "Users",
    roles: ["admin", "teacher"],
  },
  {
    title: "Manage Users",
    href: "/admin/users",
    icon: "UserCog",
    roles: ["admin"],
  },
  {
    title: "My Progress",
    href: "/student/progress",
    icon: "TrendingUp",
    roles: ["student"],
  },
  {
    title: "Upcoming Classes",
    href: "/student/classes",
    icon: "Calendar",
    roles: ["student"],
  },
];

export const COURSE_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const ENROLLMENT_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  SUSPENDED: "suspended",
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    PROFILE: "/api/auth/profile",
  },
  USERS: {
    LIST: "/api/users",
    CREATE: "/api/users",
    UPDATE: "/api/users/:id",
    DELETE: "/api/users/:id",
  },
  COURSES: {
    LIST: "/api/courses",
    CREATE: "/api/courses",
    UPDATE: "/api/courses/:id",
    DELETE: "/api/courses/:id",
    ENROLL: "/api/courses/:id/enroll",
  },
  TEST_SERIES: {
    LIST: "/api/admin/test-series",
    CREATE: "/api/admin/test-series",
    GET: "/api/admin/test-series/:id",
    UPDATE: "/api/admin/test-series/:id",
    DELETE: "/api/admin/test-series/:id",
    PUBLISH: "/api/admin/test-series/:id/publish",
    STATS: "/api/admin/test-series/:id/stats",
    ANALYTICS: "/api/admin/test-series/:id/analytics",
  },
  TESTS: {
    LIST: "/api/admin/tests",
    CREATE: "/api/admin/tests",
    GET: "/api/admin/tests/:id",
    UPDATE: "/api/admin/tests/:id",
    DELETE: "/api/admin/tests/:id",
    ANALYTICS: "/api/admin/tests/:id/analytics",
    BY_TEST_SERIES: "/api/admin/tests/test-series/:testSeriesId",
  },
  TESTS_SECTIONS: {
    LIST: "/api/admin/tests/:testId/sections",
    CREATE: "/api/admin/tests/:testId/sections",
  },
  SECTIONS: {
    LIST: "/api/admin/sections/test/:testId",
    CREATE: "/api/admin/sections",
    GET: "/api/admin/sections/:id",
    UPDATE: "/api/admin/sections/:id",
    DELETE: "/api/admin/sections/:id",
  },
  SECTIONS_QUESTIONS: {
    LIST: "/api/admin/tests/sections/:sectionId/questions",
    CREATE: "/api/admin/tests/sections/:sectionId/questions",
  },
  QUESTIONS: {
    LIST: "/api/admin/questions/section/:sectionId",
    CREATE: "/api/admin/questions",
    GET: "/api/admin/questions/:id",
    UPDATE: "/api/admin/questions/:id",
    DELETE: "/api/admin/questions/:id",
  },
  DASHBOARD: {
    STATS: "/api/dashboard/stats",
    ACTIVITY: "/api/dashboard/activity",
  },
  ORDERS: {
    HISTORY: "/api/orders/history",
  },
  CONTENT_PROGRESS: {
    RECENTLY_WATCHED: "/api/content/recently-watched",
    TRACK_PROGRESS: "/api/content/:contentId/progress",
    GET_PROGRESS: "/api/content/:contentId/progress",
    WATCH_STATS: "/api/content/watch-stats",
    MARK_COMPLETE: "/api/content/:contentId/complete",
    BATCH_PROGRESS: "/api/content/batch-progress",
  },
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const ANIMATION_VARIANTS = {
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideIn: {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 100, opacity: 0 },
  },
  scaleIn: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
  },
} as const;

// Utility function to get navigation items based on domain and role
type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const getNavigationItems = (
  hostname: string,
  role: UserRole
): NavigationItem[] => {
  console.log("Navigation Debug:", { hostname, role, ROLES });

  // Normalize role to lowercase for comparison
  const normalizedRole = role?.toLowerCase();

  // Main domain (teslaacademy.com) or localhost - admin and teacher
  if (
    hostname === "teslaacademy.com" ||
    hostname === "www.teslaacademy.com" ||
    hostname === "localhost"
  ) {
    switch (normalizedRole) {
      case ROLES.ADMIN:
        console.log("Returning ADMIN_NAVIGATION_ITEMS");
        return ADMIN_NAVIGATION_ITEMS;
      case ROLES.TEACHER:
        console.log("Returning TEACHER_NAVIGATION_ITEMS");
        return TEACHER_NAVIGATION_ITEMS;
      default:
        console.log("Returning STUDENT_NAVIGATION_ITEMS (default)");
        // Students should be redirected to subdomain
        return STUDENT_NAVIGATION_ITEMS;
    }
  }

  // Subdomain - students only
  switch (normalizedRole) {
    case ROLES.STUDENT:
      return STUDENT_NAVIGATION_ITEMS;
    case ROLES.TEACHER:
      // Teacher on subdomain should redirect to main domain
      return TEACHER_NAVIGATION_ITEMS;
    case ROLES.ADMIN:
      // Admin on subdomain should redirect to main domain
      return ADMIN_NAVIGATION_ITEMS;
    default:
      return STUDENT_NAVIGATION_ITEMS;
  }
};

// Premium theme presets optimized for both light and dark modes
export const THEME_OPTIONS = [
  {
    id: "ocean",
    name: "Ocean",
    description: "Calming blues for a professional look",
    primaryColor: "#3b82f6",
    secondaryColor: "#06b6d4",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural greens for an organic feel",
    primaryColor: "#10b981",
    secondaryColor: "#059669",
    gradient: "from-green-500 to-emerald-600",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm oranges and reds for energy",
    primaryColor: "#f97316",
    secondaryColor: "#ef4444",
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "purple-dream",
    name: "Purple Dream",
    description: "Elegant purples for sophistication",
    primaryColor: "#8b5cf6",
    secondaryColor: "#a855f7",
    gradient: "from-purple-500 to-violet-600",
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Rich teals for a modern vibe",
    primaryColor: "#14b8a6",
    secondaryColor: "#0d9488",
    gradient: "from-teal-500 to-cyan-600",
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Bold reds for impact",
    primaryColor: "#dc2626",
    secondaryColor: "#b91c1c",
    gradient: "from-red-600 to-rose-600",
  },
  {
    id: "indigo",
    name: "Indigo",
    description: "Deep blues for trust",
    primaryColor: "#6366f1",
    secondaryColor: "#4f46e5",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    id: "rose",
    name: "Rose",
    description: "Soft pinks for warmth",
    primaryColor: "#f43f5e",
    secondaryColor: "#ec4899",
    gradient: "from-rose-500 to-pink-500",
  },
  {
    id: "amber",
    name: "Amber",
    description: "Golden yellows for optimism",
    primaryColor: "#f59e0b",
    secondaryColor: "#d97706",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "slate",
    name: "Slate",
    description: "Sophisticated grays for minimalism",
    primaryColor: "#64748b",
    secondaryColor: "#475569",
    gradient: "from-slate-500 to-gray-600",
  },
  {
    id: "violet",
    name: "Violet",
    description: "Rich violets for creativity",
    primaryColor: "#7c3aed",
    secondaryColor: "#6d28d9",
    gradient: "from-violet-600 to-purple-600",
  },
  {
    id: "sky",
    name: "Sky",
    description: "Light blues for clarity",
    primaryColor: "#0ea5e9",
    secondaryColor: "#0284c7",
    gradient: "from-sky-500 to-blue-500",
  },
] as const;
