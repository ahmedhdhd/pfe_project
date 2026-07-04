"use client";

import { ChevronRight, Edit, LibraryBig, MoreHorizontal, Plus, Trash2 } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function SelectionSummary({
  title,
  description,
  breadcrumbs,
  stats,
  action,
}: {
  title: string;
  description: string;
  breadcrumbs: string[];
  stats: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {breadcrumbs.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          </div>
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <Badge key={stat} variant="secondary">
              {stat}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function HierarchyRow({
  label,
  icon: Icon,
  meta,
  isSelected,
  onClick,
  createLabel,
  onCreate,
  onEdit,
  onDelete,
}: {
  label: string;
  icon: typeof LibraryBig;
  meta: string;
  isSelected: boolean;
  onClick: () => void;
  createLabel?: string;
  onCreate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        isSelected && "border-primary bg-primary/5"
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>

      {(onCreate || onEdit || onDelete) && (
        <div
          className="flex items-center gap-1"
          onClick={(event) => event.stopPropagation()}
        >
          {onCreate && createLabel ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onCreate}
              title={createLabel}
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}

          {(onEdit || onDelete) && (
            <ActionMenu onEdit={onEdit} onDelete={onDelete} />
          )}
        </div>
      )}
    </div>
  );
}

export function ActionMenu({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="icon" variant="ghost" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {onEdit && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
