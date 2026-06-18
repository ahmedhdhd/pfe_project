"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  Clock3,
  PlayCircle,
  Search,
  TrendingUp,
} from "@/components/icons";
import { MyLearningMobile } from "@/components/student/mobile/my-learning-mobile";
import { StudentHeader } from "@/components/student/student-header";
import { useGetMyBatches, useIsMobile } from "@/hooks";
import { useRecentlyWatched, useWatchStats } from "@/hooks/api";
import apiClient from "@/lib/api/client";
import { tokenManager } from "@/lib/api/client";
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
      const content = video.content as any;
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
      enabled: isClient && !isMobile && !!batch.id,
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (!isClient) return null;
  if (isMobile) return <MyLearningMobile />;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <StudentHeader />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome Hero */}
        <section className="mb-12">
          <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 md:p-12 overflow-hidden relative">
            <div className="absolute right-8 top-8 text-[180px] font-black text-primary/5 select-none pointer-events-none">
              LEARN
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-8 relative">
              <div className="flex-1">
                <p className="text-primary font-medium tracking-widest text-sm mb-2">
                  {getGreeting()},
                </p>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  {user?.username || "Student"}
                </h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-md">
                  {nextLesson
                    ? "You're making great progress. Let's keep the momentum going."
                    : "Your learning journey starts here. What will you master today?"}
                </p>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" size="lg" className="rounded-2xl" asChild>
                  <Link href="/student/explore">
                    <Search className="mr-2 h-5 w-5" />
                    Discover
                  </Link>
                </Button>
                <Button size="lg" className="rounded-2xl shadow-lg" asChild>
                  <Link href={nextLesson?.href || "/student/explore"}>
                    <PlayCircle className="mr-2 h-5 w-5" />
                    {nextLesson ? "Continue" : "Start Learning"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard icon={BookOpen} label="Courses Enrolled" value={courses.length} />
          <StatCard icon={TrendingUp} label="Average Progress" value={`${averageCourseProgress}%`} />
          <StatCard icon={Award} label="Completed Courses" value={completedCourses} />
        </section>

        <div className="grid gap-10 xl:grid-cols-[1fr_360px]">
          <div className="space-y-12">
            <ContinueHero lesson={nextLesson} />

            <section>
              <SectionHeader
                title="My Courses"
                subtitle="Keep pushing forward"
                href="/student/explore"
                action="Browse all"
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
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside>
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

/* ====================== SUB COMPONENTS ====================== */

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card p-8 hover:border-primary/30 transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold tracking-tighter text-foreground">
            {value}
          </p>
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

function CircularProgress({
  percent,
  size = 64,
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
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
        />
      </svg>
      <span className="absolute text-sm font-bold text-foreground">
        {percent}%
      </span>
    </div>
  );
}

function ContinueHero({ lesson }: { lesson?: any }) {
  const percent =
    lesson && lesson.duration > 0
      ? Math.min(100, Math.round((lesson.watchedDuration / lesson.duration) * 100))
      : 0;

  return (
    <div className="rounded-3xl overflow-hidden border border-border bg-card group">
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-video md:aspect-auto bg-zinc-900 overflow-hidden">
          {lesson?.thumbnail ? (
            <img
              src={lesson.thumbnail}
              alt={lesson.title}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/10 to-transparent">
              <PlayCircle className="h-20 w-20 text-primary/30" />
            </div>
          )}
          {lesson && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex items-end p-8">
              <div className="text-white">
                <div className="uppercase tracking-widest text-xs mb-2 opacity-75">NOW PLAYING</div>
                <p className="text-xl font-semibold line-clamp-2">{lesson.title}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 flex flex-col justify-between">
          <div>
            <Badge className="mb-4">Continue where you left off</Badge>
            <h3 className="text-2xl font-semibold tracking-tight leading-tight">
              {lesson?.title || "No active lesson"}
            </h3>
            <p className="text-muted-foreground mt-3">
              {lesson
                ? `${lesson.batchName} • ${lesson.subject}`
                : "Start a course to see your progress here"}
            </p>
          </div>

          {lesson && (
            <div className="mt-auto pt-8">
              <div className="flex items-center gap-4">
                <CircularProgress percent={percent} />
                <div className="flex-1">
                  <Progress value={percent} className="h-2.5" />
                  <div className="flex justify-between text-sm mt-2.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{percent}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button asChild className="mt-8 w-full md:w-auto rounded-2xl" size="lg">
            <Link href={lesson?.href || "/student/explore"}>
              {lesson ? "Resume Lesson" : "Browse Courses"} <ArrowRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  action,
}: {
  title: string;
  subtitle: string;
  href: string;
  action: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <Button variant="ghost" asChild className="text-primary hover:text-primary/80">
        <Link href={href}>
          {action} <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function CourseCard({ course }: { course: PurchasedBatch & { progress: number } }) {
  return (
    <Link
      href={`/student/batches/${course.id}`}
      className="group block rounded-2xl border border-border/70 bg-card overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300"
    >
      <div className="relative h-52 bg-zinc-100 overflow-hidden">
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt={course.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-transparent">
            <BookOpen className="h-16 w-16 text-primary/20" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black text-xs">
            {course.progress}%
          </Badge>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-2 mb-4">
          <Badge variant="outline" className="text-xs">{course.exam}</Badge>
          <Badge variant="outline" className="text-xs">{course.language}</Badge>
        </div>

        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {course.name}
        </h3>

        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {course.completedLessons} / {course.totalLessons} lessons
            </span>
            <span className="font-medium">{course.progress}%</span>
          </div>
          <Progress value={course.progress} className="h-1.5" />
        </div>
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
    <div className="rounded-2xl border border-border/60 bg-card p-8 sticky top-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Your Progress</h2>
          <p className="text-sm text-muted-foreground">Real activity • This month</p>
        </div>
        <CircularProgress percent={averageCourseProgress} size={56} />
      </div>

      <div className="space-y-5">
        <ProgressLine icon={Clock3} label="Watch time" value={totalWatchTime} />
        <ProgressLine icon={PlayCircle} label="Videos completed" value={String(videosCompleted)} />
        <ProgressLine icon={TrendingUp} label="Avg. progress" value={`${averageCourseProgress}%`} />
        <ProgressLine icon={Award} label="Courses completed" value={String(completedCourses)} />
      </div>
    </div>
  );
}

function ProgressLine({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  href,
  action,
}: {
  icon: any;
  title: string;
  text: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/40 mb-6">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="font-semibold text-xl">{title}</h3>
      <p className="mt-3 text-muted-foreground max-w-xs mx-auto">{text}</p>
      <Button asChild className="mt-6 rounded-2xl" variant="outline">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <div className="h-52 bg-muted animate-pulse" />
          <div className="p-6 space-y-4">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-5 bg-muted animate-pulse rounded" />
            <div className="h-2 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}