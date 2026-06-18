"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, Wrench } from "@/components/icons";
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
  useToggleMaintenanceMode,
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
  const toggleMaintenance = useToggleMaintenanceMode();
  const deleteOrg = useDeleteOrganization();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Organisations</h1>
        <p className="text-slate-400 mt-1">Manage all tenant organizations</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Slug</TableHead>
              <TableHead className="text-slate-400">Plan</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Users</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orgs ?? []).map((org) => (
              <TableRow key={org.id} className="border-slate-800">
                <TableCell className="font-medium text-white">
                  {org.name}
                </TableCell>
                <TableCell className="text-slate-300">{org.slug}</TableCell>
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
                    <span className="text-sm text-slate-400">
                      {org.isActive ? "Active" : "Suspended"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-300">{org.userCount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/platform/organizations/${org.id}`}>
                        View detail
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Toggle maintenance mode"
                      onClick={() =>
                        toggleMaintenance.mutate({
                          id: org.id,
                          maintenanceMode: !org.maintenanceMode,
                        })
                      }
                    >
                      <Wrench className="h-4 w-4" />
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
