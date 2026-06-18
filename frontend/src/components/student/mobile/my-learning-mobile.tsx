"use client";

import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { BookOpen, Search } from "@/components/icons";
import { useGetMyBatches } from "@/hooks";
import apiClient from "@/lib/api/client";
import type { BatchProgressResponse } from "@/lib/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Batch {
  id: string;
  name: string;
  class: "11" | "12" | "12+" | "Grad";
  exam: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  language: string;
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
  totalLessons: number;
  completedLessons: number;
}

export function MyLearningMobile() {
  const { data: batchesResponse, isLoading: isLoadingBatches } =
    useGetMyBatches(1, 8);

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
      totalLessons: 0,
      completedLessons: 0,
    })
  );

  const batchProgressQueries = useQueries({
    queries: purchasedBatches.map((batch) => ({
      queryKey: ["mobileMyLearning", "batchProgress", batch.id],
      queryFn: () =>
        apiClient
          .get<BatchProgressResponse>("/api/content/batch-progress", {
            params: { batchId: batch.id },
          })
          .then((res) => res.data),
      enabled: !!batch.id,
      staleTime: 60 * 1000,
    })),
  });

  const courses = purchasedBatches.map((batch, index) => {
    const progress = batchProgressQueries[index]?.data?.data;
    return {
      ...batch,
      progress: Math.round(progress?.progressPercentage || 0),
      totalLessons: progress?.totalVideos || 0,
      completedLessons: progress?.completedVideos || 0,
    };
  });

  return (
    <div className="min-h-screen bg-background pb-24 md:hidden">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div>
            <p className="text-xs text-muted-foreground">Student workspace</p>
            <h1 className="text-lg font-semibold">My Learning</h1>
          </div>
          <Button asChild variant="outline" size="icon">
            <Link href="/student/explore">
              <Search className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="space-y-8 px-4 py-6">
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-normal">
            Pick up the next useful thing.
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Your courses are grouped here so you can get back to studying
            quickly.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <MobileStat label="Courses" value={courses.length} />
          </div>
        </section>

        <section className="space-y-3">
          <MobileSectionTitle title="Courses" href="/student/explore" />
          {isLoadingBatches ? (
            <MobileSkeleton />
          ) : courses.length === 0 ? (
            <MobileEmpty
              icon={BookOpen}
              title="No enrolled courses"
              href="/student/explore"
              action="Explore Courses"
            />
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/student/batches/${course.id}`}
                  className="block rounded-lg border bg-card p-3"
                >
                  <div className="flex gap-3">
                    <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {course.imageUrl ? (
                        <img
                          src={course.imageUrl}
                          alt={course.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{course.exam}</Badge>
                        <Badge variant="outline">{course.language}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium">
                        {course.name}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {course.completedLessons}/{course.totalLessons} lessons
                      </span>
                      <span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function MobileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function MobileSectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-end justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Button asChild variant="ghost" size="sm">
        <Link href={href}>
          View
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function MobileEmpty({
  icon: Icon,
  title,
  href,
  action,
}: {
  icon: typeof BookOpen;
  title: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-card p-6 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}

function MobileSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
