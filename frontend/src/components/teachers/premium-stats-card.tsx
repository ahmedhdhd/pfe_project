"use client";

import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: "blue" | "green" | "purple" | "orange";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function PremiumStatsCard({
  title,
  value,
  icon: Icon,
  gradient = "blue",
  trend,
}: PremiumStatsCardProps) {
  const gradientClasses = {
    blue: "from-blue-500/10 via-blue-500/5 to-transparent",
    green: "from-green-500/10 via-green-500/5 to-transparent",
    purple: "from-purple-500/10 via-purple-500/5 to-transparent",
    orange: "from-orange-500/10 via-orange-500/5 to-transparent",
  };

  const iconColors = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  return (
    <Card className="relative overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Gradient Background */}
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-br",
          gradientClasses[gradient]
        )}
      />
      
      <div className="relative p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium flex items-center gap-0.5",
                    trend.isPositive
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              "p-2 rounded-lg bg-background/50 backdrop-blur-sm shrink-0",
              iconColors[gradient]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    </Card>
  );
}
