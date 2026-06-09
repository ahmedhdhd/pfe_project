"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, BookOpen, Users, DollarSign, Loader2 } from "lucide-react";
import { usePlatformStats } from "@/hooks/platform";

export default function PlatformDashboardPage() {
  const { data: stats, isLoading, error } = usePlatformStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-24 text-slate-400">
        Failed to load platform statistics.
      </div>
    );
  }

  const kpis = [
    {
      title: "Total Orgs",
      value: stats.totalOrganizations.toLocaleString(),
      icon: Building2,
    },
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
    },
    {
      title: "Total Revenue",
      value: `${stats.totalRevenue.toLocaleString()} TND`,
      icon: DollarSign,
    },
    {
      title: "Total Courses",
      value: stats.totalCourses.toLocaleString(),
      icon: BookOpen,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="border-slate-800 bg-slate-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {kpi.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{kpi.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-6">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">
              {stats.totalStudents.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">
              {stats.totalTeachers.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              New Orgs This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-white">
              {stats.newOrgsThisMonth.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
