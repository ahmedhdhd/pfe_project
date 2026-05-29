import type { NavigationItem } from "@/lib/types";
import { STUDENT_NAVIGATION_ITEMS } from "@/lib/constants/student-navigation";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import { useMemo } from "react";

/** Maps admin/teacher/student nav hrefs to organization feature flags. */
export const NAV_HREF_FEATURE_KEY: Record<string, string> = {
  "/admin/courses": "courses",
  "/teacher/courses": "courses",
  "/admin/categories": "categories",
  "/teacher/categories": "categories",
  "/admin/users": "users",
  "/admin/teachers": "teachers",
  "/admin/announcements": "announcements",
  "/teacher/announcements": "announcements",
  "/admin/orders": "orders",
  "/admin/live-sessions": "liveSessions",
  "/teacher/live-sessions": "liveSessions",
  "/admin/assignments": "assignments",
  "/teacher/assignments": "assignments",
  "/student/live-sessions": "liveSessions",
  "/student/certificates": "certificates",
  "/student/explore": "courses",
  "/student/my-learning": "courses",
  "/student/assignments": "assignments",
  "/student/test-series": "testSeries",
  "/student/tests": "testSeries",
};

/** Student URL prefixes → feature flag (checked on direct navigation). */
export const STUDENT_PATH_FEATURE_RULES: Array<{
  prefix: string;
  feature: string;
}> = [
  { prefix: "/student/live-sessions", feature: "liveSessions" },
  { prefix: "/student/certificates", feature: "certificates" },
  { prefix: "/student/assignments", feature: "assignments" },
  { prefix: "/student/test-series", feature: "testSeries" },
  { prefix: "/student/tests", feature: "testSeries" },
  { prefix: "/student/cart", feature: "orders" },
  { prefix: "/student/checkout", feature: "orders" },
  { prefix: "/student/orders", feature: "orders" },
  { prefix: "/student/payment", feature: "orders" },
  { prefix: "/student/explore", feature: "courses" },
  { prefix: "/student/my-learning", feature: "courses" },
  { prefix: "/student/batches", feature: "courses" },
  { prefix: "/student/course", feature: "courses" },
];

export const PLATFORM_FEATURE_LABELS: Record<string, string> = {
  courses: "Courses & learning",
  categories: "Categories",
  users: "User management",
  teachers: "Teachers",
  announcements: "Announcements",
  orders: "Orders & billing",
  liveSessions: "Live sessions",
  assignments: "Assignments",
  certificates: "Certificates",
  testSeries: "Tests & quizzes",
  aiTutor: "AI tutor (student)",
  qaModule: "Q&A module",
};

export function isFeatureEnabled(
  featuresEnabled: Record<string, boolean> | undefined,
  featureKey: string
): boolean {
  if (!featuresEnabled || !(featureKey in featuresEnabled)) {
    return true;
  }
  return Boolean(featuresEnabled[featureKey]);
}

export function filterNavigationByFeatures(
  items: NavigationItem[],
  featuresEnabled?: Record<string, boolean>
): NavigationItem[] {
  return items.filter((item) => {
    const key = NAV_HREF_FEATURE_KEY[item.href];
    if (!key) return true;
    return isFeatureEnabled(featuresEnabled, key);
  });
}

export function getStudentPathFeature(normalizedPath: string): string | null {
  for (const rule of STUDENT_PATH_FEATURE_RULES) {
    if (
      normalizedPath === rule.prefix ||
      normalizedPath.startsWith(`${rule.prefix}/`)
    ) {
      return rule.feature;
    }
  }
  return null;
}

export function normalizeStudentPath(pathname: string | null): string {
  if (!pathname) return "";
  return pathname.replace(/^\/[^/]+(?=\/student)/, "") || pathname;
}

/** First enabled student home route (for redirects when a feature is off). */
export function getDefaultStudentRoute(
  featuresEnabled?: Record<string, boolean>
): string {
  const items = filterNavigationByFeatures(
    STUDENT_NAVIGATION_ITEMS,
    featuresEnabled
  );
  return items[0]?.href ?? "/student/profile";
}

export function useOrgFeaturesEnabled(): Record<string, boolean> | undefined {
  return useOrganizationConfigStore((state) => state.config?.featuresEnabled);
}

export function useStudentNavigationItems(): NavigationItem[] {
  const featuresEnabled = useOrgFeaturesEnabled();
  return useMemo(
    () => filterNavigationByFeatures(STUDENT_NAVIGATION_ITEMS, featuresEnabled),
    [featuresEnabled]
  );
}

export function useIsOrgFeatureEnabled(featureKey: string): boolean {
  const featuresEnabled = useOrgFeaturesEnabled();
  return isFeatureEnabled(featuresEnabled, featureKey);
}
