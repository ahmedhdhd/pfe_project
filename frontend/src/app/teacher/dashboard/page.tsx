"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  Plus,
  Eye,
  Edit,
  BarChart3,
  ExternalLink,
} from "@/components/icons";
import { PageHeader } from "@/components/common/page-header";
import { StatsSkeleton } from "@/components/common/loading-skeleton";
import { useCourses, useCurrentUser } from "@/hooks";
import Link from "next/link";

export default function TeacherDashboard() {
  const { data: courses, isLoading: coursesLoading } = useCourses(1, 5);
  const { data: currentUser } = useCurrentUser();
  const statsLoading = false; // Mock loading state
  const [orgUrl, setOrgUrl] = useState("");

  useEffect(() => {
    const slug = currentUser?.organizationSlug;

    if (!slug || typeof window === "undefined") {
      setOrgUrl("");
      return;
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      setOrgUrl(`${protocol}//${slug}.localhost${port}`);
      return;
    }

    if (hostname.includes("vercel.app")) {
      setOrgUrl(`${protocol}//${hostname}${port}/${slug}`);
      return;
    }

    const rootDomain = hostname.replace("www.", "").replace("teacher.", "");
    setOrgUrl(`${protocol}//${slug}.${rootDomain}${port}`);
  }, [currentUser?.organizationSlug]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Dashboard"
        description="Manage your courses and track student progress."
        breadcrumbs={[{ label: "Teacher", href: "/teacher/dashboard" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {orgUrl && (
              <Button asChild variant="outline">
                <a href={orgUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Website
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href="/teacher/courses/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <StatsSkeleton />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    My Courses
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(courses?.data as unknown[])?.filter(
                      (course) =>
                        (course as { instructorId?: string }).instructorId ===
                        "2"
                    ).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">+1 this month</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Students
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((courses?.data as unknown[])?.reduce(
                      (sum: number, course) =>
                        sum +
                        ((course as { enrolledStudents?: number })
                          .enrolledStudents || 0),
                      0
                    ) as number) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all courses
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Avg. Completion
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">68%</div>
                  <p className="text-xs text-muted-foreground">
                    +5% from last month
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Hours Taught
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">142</div>
                  <p className="text-xs text-muted-foreground">This semester</p>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Courses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>My Courses</CardTitle>
              <CardDescription>Manage and monitor your courses</CardDescription>
            </CardHeader>
            <CardContent>
              {coursesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-muted rounded animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {(courses?.data as unknown[])
                    ?.filter(
                      (course) =>
                        (course as { instructorId?: string }).instructorId ===
                        "2"
                    )
                    .map((course) => {
                      const courseData = course as {
                        id?: string;
                        title?: string;
                        enrolledStudents?: number;
                        status?: string;
                      };
                      return (
                        <div
                          key={courseData.id || Math.random()}
                          className="flex items-center space-x-4"
                        >
                          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">
                                {courseData.title || "Course"}
                              </h4>
                              <Badge
                                variant={
                                  (courseData as { isPublished?: boolean })
                                    .isPublished
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {(courseData as { isPublished?: boolean })
                                  .isPublished
                                  ? "Published"
                                  : "Draft"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {courseData.enrolledStudents || 0} students •{" "}
                              {(courseData as { lessons?: { length: number } })
                                .lessons?.length || 0}{" "}
                              lessons
                            </p>
                            <div className="flex items-center space-x-2">
                              <Progress value={68} className="flex-1" />
                              <span className="text-xs text-muted-foreground">
                                68%
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest updates from your courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      New student enrolled in Introduction to React
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        enrollment
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        2 hours ago
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      Student completed &ldquo;Getting Started with React&rdquo;
                      lesson
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        completion
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        4 hours ago
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">
                      New lesson added to Advanced TypeScript
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        course_update
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        1 day ago
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common teaching tasks and tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/teacher/courses/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/teacher/courses">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Manage Courses
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/teacher/students">
                  <Users className="mr-2 h-4 w-4" />
                  View Students
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/teacher/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
