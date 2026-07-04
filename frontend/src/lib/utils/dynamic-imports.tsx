/**
 * Centralized Dynamic Imports Configuration
 *
 * This file contains all dynamic imports for lazy loading heavy components.
 * Using dynamic imports reduces initial bundle size and improves page load performance.
 */

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Loading fallback components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const LoadingBox = () => (
  <div className="w-full h-64 bg-muted animate-pulse rounded-lg"></div>
);

// ========================================
// Heavy UI Components (Animations, 3D)
// ========================================

export const HeroSection = dynamic(
  () =>
    import("@/components/ui/3d-hero-section-boxes").then((mod) => ({
      default: mod.HeroSection,
    })),
  {
    loading: () => <LoadingBox />,
    ssr: false, // Disable SSR for 3D components
  }
);

export const AnimatedTestimonials = dynamic(
  () =>
    import("@/components/ui/animated-testimonials").then((mod) => ({
      default: mod.AnimatedTestimonials,
    })),
  {
    loading: () => <LoadingBox />,
    ssr: false,
  }
);

export const CTAWithVerticalMarquee = dynamic(
  () => import("@/components/ui/cta-with-vertical-marquee"),
  {
    loading: () => <LoadingBox />,
    ssr: false,
  }
);

export const HoverFooter = dynamic(
  () => import("@/components/ui/hover-footer"),
  {
    loading: () => <div className="min-h-[400px] bg-muted animate-pulse"></div>,
    ssr: true, // Keep SSR for footer
  }
);

// ========================================
// Modal Components (Lazy Load on Demand)
// ========================================

export const CreateBatchModal = dynamic(
  () =>
    import("@/components/admin/create-batch-modal").then((mod) => ({
      default: mod.CreateBatchModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateTeacherModal = dynamic(
  () =>
    import("@/components/admin/create-teacher-modal").then((mod) => ({
      default: mod.CreateTeacherModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditTeacherModal = dynamic(
  () =>
    import("@/components/admin/edit-teacher-modal").then((mod) => ({
      default: mod.EditTeacherModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateSubjectModal = dynamic(
  () =>
    import("@/components/admin/create-subject-modal").then((mod) => ({
      default: mod.CreateSubjectModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditSubjectModal = dynamic(
  () =>
    import("@/components/admin/edit-subject-modal").then((mod) => ({
      default: mod.EditSubjectModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateChapterModal = dynamic(
  () =>
    import("@/components/admin/create-chapter-modal").then((mod) => ({
      default: mod.CreateChapterModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditChapterModal = dynamic(
  () =>
    import("@/components/admin/edit-chapter-modal").then((mod) => ({
      default: mod.EditChapterModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateTopicModal = dynamic(
  () =>
    import("@/components/admin/create-topic-modal").then((mod) => ({
      default: mod.CreateTopicModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditTopicModal = dynamic(
  () =>
    import("@/components/admin/edit-topic-modal").then((mod) => ({
      default: mod.EditTopicModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateContentModal = dynamic(
  () =>
    import("@/components/admin/create-content-modal").then((mod) => ({
      default: mod.CreateContentModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditContentModal = dynamic(
  () =>
    import("@/components/admin/edit-content-modal").then((mod) => ({
      default: mod.EditContentModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateScheduleModal = dynamic(
  () =>
    import("@/components/admin/create-schedule-modal").then((mod) => ({
      default: mod.CreateScheduleModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditScheduleModal = dynamic(
  () =>
    import("@/components/admin/edit-schedule-modal").then((mod) => ({
      default: mod.EditScheduleModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const TeacherAssignmentModal = dynamic(
  () =>
    import("@/components/admin/teacher-assignment-modal").then((mod) => ({
      default: mod.TeacherAssignmentModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditBatchModal = dynamic(
  () =>
    import("@/components/admin/edit-batch-modal").then((mod) => ({
      default: mod.EditBatchModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

// ========================================
// Rich Text Editor (Heavy Dependency)
// ========================================

export const RichTextEditor = dynamic(
  () =>
    import("@/components/ui/rich-text-editor").then((mod) => ({
      default: mod.RichTextEditor,
    })),
  {
    loading: () => (
      <div className="min-h-[200px] bg-muted animate-pulse rounded-lg"></div>
    ),
    ssr: false, // Tiptap doesn't work well with SSR
  }
);

// ========================================
// Video Player (Heavy Dependency)
// ========================================

export const UnifiedVideoPlayer = dynamic(
  () =>
    import("@/components/common/unified-video-player").then((mod) => ({
      default: mod.UnifiedVideoPlayer,
    })),
  {
    loading: () => (
      <div className="w-full aspect-video bg-muted animate-pulse rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground">Loading video player...</p>
      </div>
    ),
    ssr: false, // Video.js requires window object
  }
);

// ========================================
// Data Tables (Can be large with many rows)
// ========================================

export const SubjectDataTable = dynamic(
  () =>
    import("@/components/courses/subject-data-table").then((mod) => ({
      default: mod.SubjectDataTable,
    })),
  { loading: () => <LoadingSpinner /> }
);

// ========================================
// Type exports for better TypeScript support
// ========================================

export type DynamicComponent<P = Record<string, unknown>> = ComponentType<P>;
