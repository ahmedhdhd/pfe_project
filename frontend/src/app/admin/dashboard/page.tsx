"use client";

import { useState, useEffect, useMemo } from "react";
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
  Users,
  BookOpen,
  TrendingUp,
  Activity,
  UserPlus,
  BookPlus,
  UserCheck,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatsSkeleton } from "@/components/common/loading-skeleton";
import { InviteUserModal } from "@/components/common/invite-user-modal";
import { useCurrentUser } from "@/hooks";
import {
  useGetAllBatches,
  useGetAllTeachers,
  useGetAllUsers,
  useGetAnnouncements,
  useOrganizationConfigAdmin,
} from "@/hooks/api";
import { useRolePermissions } from "@/hooks/common/use-role-permissions";
import Link from "next/link";

interface DashboardUser {
  id: string;
  email?: string | null;
  username: string;
  role: string;
  createdAt?: string;
}

interface DashboardBatch {
  id: string;
  name: string;
  status?: string;
  createdAt?: string;
  _count?: {
    enrollments?: number;
    subjects?: number;
  };
}

interface DashboardTeacher {
  id: string;
  name: string;
  createdAt?: string;
}

interface DashboardAnnouncement {
  id: string;
  subject: string;
  recipientCount: number;
  createdAt: string;
  audienceType: "ORGANIZATION" | "COURSE";
}

interface ActivityItem {
  id: string;
  type: "student" | "course" | "teacher" | "announcement";
  message: string;
  timestamp: string;
}

export default function AdminDashboard() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const { isAdmin } = useRolePermissions();
  const { data: configData } = useOrganizationConfigAdmin();
  const { data: usersResponse, isLoading: usersLoading } = useGetAllUsers();
  const { data: batchesResponse, isLoading: batchesLoading } = useGetAllBatches();
  const { data: teachersResponse, isLoading: teachersLoading } =
    useGetAllTeachers();
  const { data: announcementsResponse, isLoading: announcementsLoading } =
    useGetAnnouncements();
  console.log(isAdmin, "isAdmin");
  console.log(currentUser, "currentUser");

  // Org name: prefer session data (from login), fall back to config API
  const orgName = currentUser?.organizationName || (configData?.success && configData.data ? configData.data.name : null);

  const [orgUrl, setOrgUrl] = useState<string>("");

  useEffect(() => {
    const slug = currentUser?.organizationSlug || configData?.data?.slug;
    const customDomain = configData?.data?.domain;
    
    if (customDomain) {
      setOrgUrl(`https://${customDomain}`);
      return;
    }
    
    if (slug && typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : "";
      
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        setOrgUrl(`${protocol}//${slug}.localhost${port}`);
      } else if (hostname.includes("vercel.app")) {
        setOrgUrl(`${protocol}//${hostname}${port}/${slug}`);
      } else {
        const rootDomain = hostname.replace("www.", "").replace("admin.", ""); 
        setOrgUrl(`${protocol}//${slug}.${rootDomain}${port}`);
      }
    }
  }, [currentUser, configData]);

  const users = useMemo(
    () => ((usersResponse?.data as DashboardUser[] | undefined) ?? []),
    [usersResponse?.data]
  );
  const batches = useMemo(
    () => ((batchesResponse?.data as DashboardBatch[] | undefined) ?? []),
    [batchesResponse?.data]
  );
  const teachers = useMemo(
    () => ((teachersResponse?.data as DashboardTeacher[] | undefined) ?? []),
    [teachersResponse?.data]
  );
  const announcements = useMemo(
    () =>
      ((announcementsResponse?.data as DashboardAnnouncement[] | undefined) ??
        []),
    [announcementsResponse?.data]
  );

  const statsLoading = usersLoading || batchesLoading || teachersLoading;
  const activitiesLoading =
    usersLoading || batchesLoading || teachersLoading || announcementsLoading;

  const studentCount = users.filter((user) => user.role === "STUDENT").length;
  const publishedCourses = batches.filter((batch) => batch.status === "ACTIVE").length;
  const draftCourses = batches.length - publishedCourses;
  const totalEnrollments = batches.reduce(
    (sum, batch) => sum + (batch._count?.enrollments || 0),
    0
  );

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [
      ...users
        .filter((user) => user.role === "STUDENT" && user.createdAt)
        .map((user) => ({
          id: `student-${user.id}`,
          type: "student" as const,
          message: `${user.username} joined the platform as a student`,
          timestamp: user.createdAt as string,
        })),
      ...batches
        .filter((batch) => batch.createdAt)
        .map((batch) => ({
          id: `course-${batch.id}`,
          type: "course" as const,
          message: `Course "${batch.name}" was created`,
          timestamp: batch.createdAt as string,
        })),
      ...teachers
        .filter((teacher) => teacher.createdAt)
        .map((teacher) => ({
          id: `teacher-${teacher.id}`,
          type: "teacher" as const,
          message: `${teacher.name} was added as a teacher`,
          timestamp: teacher.createdAt as string,
        })),
      ...announcements.map((announcement) => ({
        id: `announcement-${announcement.id}`,
        type: "announcement" as const,
        message: `Announcement "${announcement.subject}" was sent to ${announcement.recipientCount} recipients`,
        timestamp: announcement.createdAt,
      })),
    ];

    return items
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 5);
  }, [announcements, batches, teachers, users]);

  const topCourses = useMemo(() => {
    const maxEnrollments = Math.max(
      ...batches.map((batch) => batch._count?.enrollments || 0),
      0
    );

    return batches
      .slice()
      .sort(
        (a, b) => (b._count?.enrollments || 0) - (a._count?.enrollments || 0)
      )
      .slice(0, 5)
      .map((batch) => {
        const enrollments = batch._count?.enrollments || 0;
        return {
          ...batch,
          enrollments,
          performance:
            maxEnrollments > 0 ? Math.round((enrollments / maxEnrollments) * 100) : 0,
        };
      });
  }, [batches]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={orgName ? `${orgName} — Dashboard` : "Admin Dashboard"}
        description={orgName ? `Welcome back! Here's what's happening with ${orgName}.` : "Welcome back! Here's what's happening with your learning platform."}
        breadcrumbs={[{ label: orgName || "Admin", href: "/admin/dashboard" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {orgUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={orgUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Website
                </a>
              </Button>
            )}
            <Button asChild size="sm">
              <Link href="/admin/users">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Invite
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/courses">
                <BookPlus className="mr-2 h-4 w-4" />
                Create Course
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {statsLoading ? (
          <StatsSkeleton />
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total Courses</p>
                  <p className="text-xl font-bold">
                    {batches.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {publishedCourses} published • {draftCourses} drafts
                  </p>
                </div>
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Total Students</p>
                  <p className="text-xl font-bold">
                    {studentCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {users.length} total user accounts
                  </p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Active Enrollments</p>
                  <p className="text-xl font-bold">
                    {totalEnrollments}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Across all courses
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Teachers</p>
                  <p className="text-xl font-bold">
                    {teachers.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Active teaching profiles
                  </p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates from your platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No activity yet. Create a course, add users, or send an announcement to see updates here.
                    </p>
                  ) : (
                    activities.map((activityData, index) => {
                      return (
                        <div
                          key={activityData.id || index}
                          className="flex items-start space-x-4"
                        >
                          <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm">
                              {activityData.message || "Activity"}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="secondary"
                                className="text-xs capitalize"
                              >
                                {activityData.type || "activity"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(
                                  activityData.timestamp || Date.now()
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/users">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Manage Users
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start w-full"
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Invite Teacher
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/courses">
                    <BookPlus className="mr-2 h-4 w-4" />
                    Manage Courses
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/settings">
                    <Activity className="mr-2 h-4 w-4" />
                    Platform Settings
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/admin/analytics">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Analytics
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Course Progress Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Course Performance</CardTitle>
            <CardDescription>
              Top courses by enrollments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses available yet.
              </p>
            ) : (
              <div className="space-y-4">
                {topCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{course.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.enrollments} enrollments •{" "}
                        {course._count?.subjects || 0} subjects •{" "}
                        {course.status === "ACTIVE" ? "Published" : "Draft"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{course.performance}%</p>
                      <Progress value={course.performance} className="w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Invite User Modal */}
      {currentUser?.organizationId && (
        <InviteUserModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          organizationId={currentUser.organizationId}
        />
      )}
    </div>
  );
}
