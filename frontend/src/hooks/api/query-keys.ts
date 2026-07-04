// Shared TanStack Query cache keys used across the admin/auth/batch API hooks.
// Query Keys
export const queryKeys = {
  user: ["user"] as const,
  organization: ["organization"] as const,
  organizationConfig: (slug: string) => ["organizationConfig", slug] as const,
  emailAvailability: (email: string) => ["emailAvailability", email] as const,
  users: ["users"] as const,
  batches: ["batches"] as const,
  batch: (id: string) => ["batch", id] as const,
  batchReviews: (id: string) => ["batch", id, "reviews"] as const,
  categories: ["categories"] as const,
  announcements: ["announcements"] as const,
  teachers: ["teachers"] as const,
};
