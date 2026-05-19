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
    import("@/components/common/create-batch-modal").then((mod) => ({
      default: mod.CreateBatchModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateTeacherModal = dynamic(
  () =>
    import("@/components/common/create-teacher-modal").then((mod) => ({
      default: mod.CreateTeacherModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditTeacherModal = dynamic(
  () =>
    import("@/components/common/edit-teacher-modal").then((mod) => ({
      default: mod.EditTeacherModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateSubjectModal = dynamic(
  () =>
    import("@/components/common/create-subject-modal").then((mod) => ({
      default: mod.CreateSubjectModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditSubjectModal = dynamic(
  () =>
    import("@/components/common/edit-subject-modal").then((mod) => ({
      default: mod.EditSubjectModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateChapterModal = dynamic(
  () =>
    import("@/components/common/create-chapter-modal").then((mod) => ({
      default: mod.CreateChapterModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditChapterModal = dynamic(
  () =>
    import("@/components/common/edit-chapter-modal").then((mod) => ({
      default: mod.EditChapterModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateTopicModal = dynamic(
  () =>
    import("@/components/common/create-topic-modal").then((mod) => ({
      default: mod.CreateTopicModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditTopicModal = dynamic(
  () =>
    import("@/components/common/edit-topic-modal").then((mod) => ({
      default: mod.EditTopicModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateContentModal = dynamic(
  () =>
    import("@/components/common/create-content-modal").then((mod) => ({
      default: mod.CreateContentModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditContentModal = dynamic(
  () =>
    import("@/components/common/edit-content-modal").then((mod) => ({
      default: mod.EditContentModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateScheduleModal = dynamic(
  () =>
    import("@/components/common/create-schedule-modal").then((mod) => ({
      default: mod.CreateScheduleModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditScheduleModal = dynamic(
  () =>
    import("@/components/common/edit-schedule-modal").then((mod) => ({
      default: mod.EditScheduleModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateTestSeriesModal = dynamic(
  () =>
    import("@/components/test-series/create-test-series-modal").then((mod) => ({
      default: mod.CreateTestSeriesModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditTestSeriesModal = dynamic(
  () =>
    import("@/components/test-series/edit-test-series-modal").then((mod) => ({
      default: mod.EditTestSeriesModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const CreateTestModal = dynamic(
  () =>
    import("@/components/test-series/create-test-modal").then((mod) => ({
      default: mod.CreateTestModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const TeacherAssignmentModal = dynamic(
  () =>
    import("@/components/common/teacher-assignment-modal").then((mod) => ({
      default: mod.TeacherAssignmentModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

export const EditBatchModal = dynamic(
  () =>
    import("@/components/common/edit-batch-modal").then((mod) => ({
      default: mod.EditBatchModal,
    })),
  { loading: () => <LoadingSpinner /> }
);

// ========================================
// Test Engine Components
// ========================================

export const TestEngine = dynamic(
  () =>
    import("@/components/test-engine/test-engine").then((mod) => ({
      default: mod.TestEngine,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">Loading test engine...</p>
        </div>
      </div>
    ),
    ssr: false, // Test engine should not be SSR'd
  }
);

export const QuestionPalette = dynamic(
  () =>
    import("@/components/test-engine/question-palette").then((mod) => ({
      default: mod.QuestionPalette,
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

export const TestSeriesDataTable = dynamic(
  () =>
    import("@/components/test-series/test-series-data-table").then((mod) => ({
      default: mod.TestSeriesDataTable,
    })),
  { loading: () => <LoadingSpinner /> }
);

// ========================================
// Type exports for better TypeScript support
// ========================================

export type DynamicComponent<P = Record<string, unknown>> = ComponentType<P>;
