"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { StatsSkeleton } from "@/components/common/loading-skeleton";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileWarning,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "@/components/icons";
import { usePlatformOrganizations, usePlatformReports, usePlatformStats } from "@/hooks/platform";

interface PlatformActivityItem {
  id: string;
  type: "organization" | "report" | "revenue" | "course";
  message: string;
  timestamp: string;
}

const MetricCard = ({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: typeof Building2;
}) => (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">{title}</p>
        <p className="text-xl font-bold">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{helper}</p>
      </div>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
    </div>
  </Card>
);

export default function PlatformDashboardPage() {
  const [now] = useState(() => new Date());
  const { data: stats, isLoading, error } = usePlatformStats();
  const { data: organizations = [] } = usePlatformOrganizations();
  const { data: reports = [] } = usePlatformReports();

  const analytics = useMemo(() => {
    const activeOrganizations = organizations.filter((org) => org.isActive).length;
    const pendingReports = reports.filter((report) => report.status === "PENDING").length;
    const resolvedReports = reports.filter((report) => report.status === "RESOLVED").length;
    const topOrganizations = organizations
      .slice()
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, 5);
    const maxUsers = Math.max(...topOrganizations.map((org) => org.userCount), 0);
    const resolutionRate = reports.length
      ? Math.round((resolvedReports / reports.length) * 100)
      : 0;

    const activities: PlatformActivityItem[] = [
      ...organizations
        .filter((org) => org.createdAt)
        .map((org) => ({
          id: `org-${org.id}`,
          type: "organization" as const,
          message: `${org.name} joined the platform`,
          timestamp: org.createdAt,
        })),
      ...reports.slice(0, 5).map((report) => ({
        id: `report-${report.id}`,
        type: "report" as const,
        message:
          report.status === "PENDING"
            ? `New report submitted: ${report.reason}`
            : `Report ${report.status.toLowerCase()} for ${report.reason}`,
        timestamp: report.createdAt,
      })),
    ];

    return {
      activeOrganizations,
      pendingReports,
      resolvedReports,
      resolutionRate,
      topOrganizations: topOrganizations.map((org) => ({
        ...org,
        share: maxUsers > 0 ? Math.round((org.userCount / maxUsers) * 100) : 0,
      })),
      activities: activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5),
    };
  }, [organizations, reports]);

  if (isLoading) {
    return <StatsSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-6 py-16 text-center text-destructive">
        Failed to load platform statistics.
      </div>
    );
  }

  const publishedCourses = stats.totalCourses;
  const kpis = [
    {
      title: "Total Orgs",
      value: stats.totalOrganizations.toLocaleString(),
      helper: `${analytics.activeOrganizations} active organizations`,
      icon: Building2,
    },
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      helper: `${stats.totalStudents.toLocaleString()} students and ${stats.totalTeachers.toLocaleString()} teachers`,
      icon: Users,
    },
    {
      title: "Total Revenue",
      value: `${stats.totalRevenue.toLocaleString()} TND`,
      helper: "Across all organizations",
      icon: TrendingUp,
    },
    {
      title: "Total Courses",
      value: publishedCourses.toLocaleString(),
      helper: `${stats.totalEnrollments.toLocaleString()} enrollments`,
      icon: BookOpen,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Dashboard"
        description="Super admin overview and key platform metrics"
        breadcrumbs={[{ label: "Platform", href: "/platform/dashboard" }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/platform/organizations">
                <Building2 className="mr-2 h-4 w-4" />
                Organisations
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/platform/reports">
                <FileWarning className="mr-2 h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit Site
              </a>
            </Button>
          </div>
        }
      />

      <section className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Super admin overview
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Platform snapshot
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Monitor growth, activity, and moderation from one clean dashboard
                that follows the same structure as the admin dashboard.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">Active Orgs</p>
              <p className="mt-2 text-2xl font-bold">{analytics.activeOrganizations}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">Pending Reports</p>
              <p className="mt-2 text-2xl font-bold">{analytics.pendingReports}</p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="text-xs font-medium text-muted-foreground">Resolved Rate</p>
              <p className="mt-2 text-2xl font-bold">{analytics.resolutionRate}%</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;

          return (
            <MetricCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              helper={kpi.helper}
              icon={Icon}
            />
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
              <CardDescription>Latest updates from your platform</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity yet. Add an organization or resolve a report to see updates here.
                </p>
              ) : (
                <div className="space-y-4">
                  {analytics.activities.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4">
                      <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm">{item.message}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {item.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.timestamp || now).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common super admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/platform/organizations">
                    <Building2 className="mr-2 h-4 w-4" />
                    Manage Organisations
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/platform/reports">
                    <FileWarning className="mr-2 h-4 w-4" />
                    Review Reports
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/platform/organizations">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Organization
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/platform/dashboard">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Statistics
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Organization Performance</CardTitle>
              <CardDescription>Top organizations by user count</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topOrganizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No organizations available yet.</p>
              ) : (
                <div className="space-y-4">
                  {analytics.topOrganizations.map((org) => (
                    <div key={org.id} className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.userCount} users • {org.plan} plan •{" "}
                          {org.isActive ? "Active" : "Suspended"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{org.share}%</p>
                        <Progress value={org.share} className="w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Support Overview</CardTitle>
              <CardDescription>Reports and moderation status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">Pending</p>
                  <p className="mt-2 text-xl font-bold">{analytics.pendingReports}</p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">Resolved</p>
                  <p className="mt-2 text-xl font-bold">{analytics.resolvedReports}</p>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-xs font-medium text-muted-foreground">Resolution</p>
                  <p className="mt-2 text-xl font-bold">{analytics.resolutionRate}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Report resolution</span>
                  <span className="font-medium">{analytics.resolutionRate}%</span>
                </div>
                <Progress value={analytics.resolutionRate} />
                <p className="text-xs text-muted-foreground">
                  {analytics.pendingReports === 0
                    ? "No open moderation items right now."
                    : `${analytics.pendingReports} reports still need attention.`}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Students</p>
              <p className="text-xl font-bold">{stats.totalStudents.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Learning accounts on the platform
              </p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Teachers</p>
              <p className="text-xl font-bold">{stats.totalTeachers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active teaching profiles
              </p>
            </div>
            <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">New Orgs This Month</p>
              <p className="text-xl font-bold">{stats.newOrgsThisMonth.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Growth since the beginning of the month
              </p>
            </div>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Notes</CardTitle>
            <CardDescription>High-level insight at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {analytics.pendingReports > 0
                  ? "There are open reports waiting for moderation."
                  : "The moderation queue is currently clear."}
              </p>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Revenue is tracked across all organizations and helps identify platform growth.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Summary</CardTitle>
            <CardDescription>Core totals for quick review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Organizations</span>
              <span className="font-medium">{stats.totalOrganizations.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Courses</span>
              <span className="font-medium">{stats.totalCourses.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium">{stats.totalRevenue.toLocaleString()} TND</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
