"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Trash2 } from "@/components/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  usePlatformOrganizations,
  useUpdateOrganizationStatus,
  useDeleteOrganization,
} from "@/hooks/platform";

const planVariant = (plan: string) => {
  switch (plan) {
    case "enterprise":
      return "default";
    case "pro":
      return "secondary";
    case "basic":
      return "outline";
    default:
      return "outline";
  }
};

export default function PlatformOrganizationsPage() {
  const { data: orgs, isLoading, error } = usePlatformOrganizations();
  const updateStatus = useUpdateOrganizationStatus();
  const deleteOrg = useDeleteOrganization();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const activeCount = (orgs ?? []).filter((org) => org.isActive).length;
  const suspendedCount = (orgs ?? []).length - activeCount;
  const enterpriseCount = (orgs ?? []).filter((org) => org.plan === "enterprise").length;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete organization "${name}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteOrg.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-slate-400">
        Failed to load organizations.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_35%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#f1f5f9_100%)] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-700">
              <Building2 className="h-3.5 w-3.5" />
              Organization management
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Organisations
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                Review tenant status, user counts, and subscription mix from one clear workspace.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[26rem]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{activeCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Suspended</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{suspendedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Enterprise</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{enterpriseCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Slug</TableHead>
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Users</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orgs ?? []).length === 0 ? (
              <TableRow className="border-slate-200">
                <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                  No organizations found.
                </TableCell>
              </TableRow>
            ) : (
              (orgs ?? []).map((org) => (
                <TableRow key={org.id} className="border-slate-200">
                  <TableCell className="font-medium text-slate-900">
                    {org.name}
                  </TableCell>
                  <TableCell className="text-slate-600">{org.slug}</TableCell>
                  <TableCell>
                    <Badge variant={planVariant(org.plan)} className="capitalize">
                      {org.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={org.isActive}
                        onCheckedChange={(checked) =>
                          updateStatus.mutate({ id: org.id, isActive: checked })
                        }
                      />
                      <span className="text-sm text-slate-500">
                        {org.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{org.userCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/platform/organizations/${org.id}`}>
                          View detail
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === org.id}
                        onClick={() => handleDelete(org.id, org.name)}
                      >
                        {deletingId === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
