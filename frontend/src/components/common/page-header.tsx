"use client";

import { ReactNode } from "react";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Link
            href="/"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center space-x-1">
              <ChevronRight className="h-4 w-4" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground">{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">{actions}</div>
        )}
      </div>

      <Separator />
    </div>
  );
}
