"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  PlayCircle,
  Search,
  TrendingUp,
} from "@/components/icons";
import { MyLearningMobile } from "@/components/student/mobile/my-learning-mobile";
import { StudentHeader } from "@/components/student/student-header";
import { useClientMyEnrollments } from "@/hooks/test-series-client";
import { useGetMyBatches, useIsMobile } from "@/hooks";
import { useRecentlyWatched, useWatchStats } from "@/hooks/api";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
import { useTestAttemptStats } from "@/hooks/test-attempts-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { BatchProgressResponse } from "@/lib/types/api";

interface Batch {
  id: string;
  name: string;
  description?: string | null;
  class: "11" | "12" | "12+" | "Grad";
  exam: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  language: string;
  totalPrice: number;
  discountPercentage: number;
}

interface PurchasedBatch {
  id: string;
  name: string;
  class: string;
  exam: string;
  imageUrl?: string;
  startDate: Date;
  endDate: Date;
  language: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
}

interface PurchasedTestSeries {
  id: string;
  title: string;
  exam: string;
  imageUrl?: string;
  totalTests: number;
  validUntil: Date;
}

export default function MyLearningPage() {
  const { isMobile, isClient } = useIsMobile();
  const user = tokenManager.getUser();

  const { data: recentlyWatchedResponse } = useRecentlyWatched({
    page: 1,
    limit: 6,
  });
  const { data: watchStats } = useWatchStats();
  const { data: batchesResponse, isLoading: isLoadingBatches } =
    useGetMyBatches(1, 8);

  const recentVideos =
    recentlyWatchedResponse?.data?.videos?.map((video) => {
      const content = video.content as {
        id: string;
        name: string;
        topicId?: string;
        subject?: { name: string; id?: string };
        videoThumbnail?: string;
        batch?: { name: string; id?: string };
        topic?: {
          id?: string;
          chapterId?: string;
          chapter?: {
            id?: string;
            subject?: {
              batchId?: string;
            };
          };
        };
      };

      const contentId = content.id;
      const topicId = content.topicId || content.topic?.id;
      const chapterId = content.topic?.chapterId || content.topic?.chapter?.id;
      const batchId =
        content.batch?.id || content.topic?.chapter?.subject?.batchId;

      return {
        id: content.id,
        title: content.name || "Untitled lesson",
        subject: content.subject?.name || "Lesson",
        thumbnail: content.videoThumbnail || "",
        duration: video.progress.totalDuration || 0,
        watchedDuration: video.progress.watchedSeconds || 0,
        lastWatchedAt: video.progress.lastWatchedAt
          ? new Date(video.progress.lastWatchedAt)
          : new Date(),
        batchName: content.batch?.name || "Course",
        href:
          batchId && chapterId && topicId && contentId
            ? `/student/batches/${batchId}/chapters/${chapterId}/topics/${topicId}/content/${contentId}`
            : undefined,
      };
    }) || [];

  const purchasedBatches: PurchasedBatch[] = (batchesResponse?.data || []).map(
    (batch: Batch) => ({
      id: batch.id,
      name: batch.name,
      class: batch.class,
      exam: batch.exam,
      imageUrl: batch.imageUrl,
      startDate: new Date(batch.startDate),
      endDate: new Date(batch.endDate),
      language: batch.language,
      progress: 0,
      completedLessons: 0,
      totalLessons: 0,
    })
  );

  const batchProgressQueries = useQueries({
    queries: purchasedBatches.map((batch) => ({
      queryKey: ["myLearning", "batchProgress", batch.id],
      queryFn: () =>
        apiClient
          .get<BatchProgressResponse>("/api/content/batch-progress", {
            params: { batchId: batch.id },
          })
          .then((res) => res.data),
      enabled: isClient && isMobile === false && !!batch.id,
      staleTime: 60 * 1000,
    })),
  });

  const courses = purchasedBatches.map((batch, index) => {
    const progress = batchProgressQueries[index]?.data?.data;
    return {
      ...batch,
      progress: Math.round(progress?.progressPercentage || 0),
      completedLessons: progress?.completedVideos || 0,
      totalLessons: progress?.totalVideos || 0,
    };
  });

  const nextLesson = recentVideos[0];
  const averageCourseProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce((sum, course) => sum + course.progress, 0) /
            courses.length
        )
      : 0;
  const completedCourses = courses.filter(
    (course) =>
      course.totalLessons > 0 && course.completedLessons >= course.totalLessons
  ).length;

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (!isClient) {
    return null;
  }

  if (isMobile) {
    return <MyLearningMobile />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StudentHeader />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ── Welcome Section ── */}
        <section className="mb-8 animate-slide-up">
          <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary mb-1">
                  {getGreeting()},
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                  {user?.username || "Student"}
                </h1>
                <p className="mt-1.5 text-muted-foreground text-sm max-w-lg">
                  {nextLesson
                    ? "You have a lesson in progress. Pick up where you left off."
                    : "Ready to learn something new? Explore available courses."}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href="/student/explore">
                    <Search className="mr-2 h-4 w-4" />
                    Explore
                  </Link>
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href={nextLesson?.href || "/student/explore"}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {nextLesson ? "Continue Learning" : "Find a Course"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Row ── */}
        <section className="grid gap-4 md:grid-cols-3 mb-8 stagger-children">
          <StatCard
            icon={BookOpen}
            label="Courses Enrolled"
            value={courses.length}
          />
          <StatCard
            icon={TrendingUp}
            label="Avg. Progress"
            value={`${averageCourseProgress}%`}
          />
          <StatCard
            icon={Award}
            label="Completed"
            value={completedCourses}
          />
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── Main Content ── */}
          <div className="space-y-8">
            {/* Continue Learning Hero */}
            <ContinueHero lesson={nextLesson} />

            {/* Course Grid */}
            <section>
              <SectionHeader
                title="My Courses"
                subtitle="Your enrolled courses and progress"
                href="/student/explore"
                action="Explore More"
              />

              {isLoadingBatches ? (
                <LoadingGrid />
              ) : courses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No courses yet"
                  text="Explore available courses and start your learning journey."
                  href="/student/explore"
                  action="Browse Courses"
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Right Sidebar ── */}
          <aside className="space-y-5">
            <ProgressPanel
              totalWatchTime={
                watchStats?.data?.totalWatchTimeFormatted || "0h 0m"
              }
              videosCompleted={watchStats?.data?.completedVideosCount || 0}
              averageCourseProgress={averageCourseProgress}
              completedCourses={completedCourses}
            />

          </aside>
        </div>
      </main>
    </div>
  );
}

// ── Sub-Components ──

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 border-l-4 border-l-primary/70 hover-lift">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function CircularProgress({
  percent,
  size = 56,
  strokeWidth = 5,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-primary transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={
            {
              "--ring-circumference": circumference,
              "--ring-offset": offset,
            } as React.CSSProperties
          }
        />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">
        {percent}%
      </span>
    </div>
  );
}

function ContinueHero({
  lesson,
}: {
  lesson?: {
    title: string;
    subject: string;
    batchName: string;
    thumbnail: string;
    href?: string;
    watchedDuration: number;
    duration: number;
  };
}) {
  const percent =
    lesson && lesson.duration > 0
      ? Math.min(
          100,
          Math.round((lesson.watchedDuration / lesson.duration) * 100)
        )
      : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card hover-lift">
      <div className="grid md:grid-cols-[280px_minmax(0,1fr)]">
        {/* Thumbnail */}
        <div className="relative min-h-48 bg-muted overflow-hidden">
          {lesson?.thumbnail ? (
            <img
              src={lesson.thumbnail}
              alt={lesson.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center bg-primary/5">
              <PlayCircle className="h-14 w-14 text-primary/30" />
            </div>
          )}
          {/* Play overlay on hover */}
          {lesson && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                <PlayCircle className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between gap-5 p-6">
          <div>
            <Badge
              variant="outline"
              className="mb-3 text-xs bg-primary/5 text-primary border-primary/20"
            >
              Continue Learning
            </Badge>
            <h2 className="text-xl font-bold text-foreground tracking-tight line-clamp-2">
              {lesson?.title || "No lesson in progress"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {lesson
                ? `${lesson.batchName} · ${lesson.subject}`
                : "Start a course and your next lesson will appear here."}
            </p>
          </div>

          <div className="space-y-4">
            {lesson ? (
              <div className="flex items-center gap-5">
                <CircularProgress percent={percent} />
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Lesson progress
                    </span>
                    <span className="font-semibold text-foreground">
                      {percent}%
                    </span>
                  </div>
                  <Progress value={percent} className="h-2" />
                </div>
              </div>
            ) : null}
            <Button asChild className="w-fit rounded-xl">
              <Link href={lesson?.href || "/student/explore"}>
                {lesson ? "Continue Lesson" : "Explore Courses"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  action,
  compact,
}: {
  title: string;
  subtitle: string;
  href: string;
  action: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div>
        <h2
          className={
            compact
              ? "text-lg font-bold text-foreground"
              : "text-xl font-bold text-foreground"
          }
        >
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="text-primary hover:text-primary/80 shrink-0"
      >
        <Link href={href}>
          {action}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}

function CourseCard({ course }: { course: PurchasedBatch }) {
  return (
    <Link
      href={`/student/batches/${course.id}`}
      className="group block rounded-xl border border-border/60 bg-card overflow-hidden hover-lift"
    >
      {/* Thumbnail */}
      <div className="h-36 overflow-hidden bg-muted">
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt={course.name}
            className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-primary/5">
            <BookOpen className="h-10 w-10 text-primary/20" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className="text-[11px] bg-primary/10 text-primary border-0"
          >
            {course.exam}
          </Badge>
          <Badge
            variant="outline"
            className="text-[11px] text-muted-foreground"
          >
            {course.language}
          </Badge>
        </div>

        <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
          {course.name}
        </h3>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {course.completedLessons}/{course.totalLessons} lessons
            </span>
            <span className="font-semibold text-foreground">
              {course.progress}%
            </span>
          </div>
          <Progress value={course.progress} className="h-1.5" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            Ends{" "}
            {course.endDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}

function PracticeCard({ series }: { series: PurchasedTestSeries }) {
  return (
    <Link
      href={`/student/test-series/${series.id}`}
      className="block rounded-xl border border-border/60 bg-card p-4 hover-lift group"
    >
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {series.title}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{series.exam}</span>
            <span>·</span>
            <span>{series.totalTests} tests</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>
          Valid until{" "}
          {series.validUntil.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </Link>
  );
}

function ProgressPanel({
  totalWatchTime,
  videosCompleted,
  averageCourseProgress,
  completedCourses,
}: {
  totalWatchTime: string;
  videosCompleted: number;
  averageCourseProgress: number;
  completedCourses: number;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Progress</h2>
          <p className="text-xs text-muted-foreground">
            Based on your real activity
          </p>
        </div>
        <CircularProgress percent={averageCourseProgress} size={48} strokeWidth={4} />
      </div>
      <div className="space-y-3.5">
        <ProgressLine icon={Clock3} label="Watch time" value={totalWatchTime} />
        <ProgressLine
          icon={PlayCircle}
          label="Videos completed"
          value={String(videosCompleted)}
        />
        <ProgressLine
          icon={TrendingUp}
          label="Avg. progress"
          value={`${averageCourseProgress}%`}
        />
        <ProgressLine
          icon={Award}
          label="Completed"
          value={String(completedCourses)}
        />
      </div>
    </section>
  );
}

function ProgressLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  href,
  action,
  compact,
}: {
  icon: typeof BookOpen;
  title: string;
  text: string;
  href: string;
  action: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border bg-card text-center ${
        compact ? "p-6" : "p-10"
      }`}
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/5 text-primary/40 mx-auto mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-xs text-xs text-muted-foreground">
        {text}
      </p>
      <Button asChild className="mt-4 rounded-xl" variant="outline" size="sm">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="h-36 animate-pulse bg-muted" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-2 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-24 animate-pulse rounded-xl bg-muted"
        />
      ))}
    </div>
  );
}
