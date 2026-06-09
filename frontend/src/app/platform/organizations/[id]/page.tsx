"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  usePlatformOrganization,
  useUpdateOrganizationPlan,
  useToggleMaintenanceMode,
  useDeleteOrganization,
} from "@/hooks/platform";

export default function PlatformOrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: org, isLoading, error } = usePlatformOrganization(id);
  const updatePlan = useUpdateOrganizationPlan();
  const toggleMaintenance = useToggleMaintenanceMode();
  const deleteOrg = useDeleteOrganization();

  const [plan, setPlan] = useState("free");
  const [subscriptionPrice, setSubscriptionPrice] = useState("0");

  useEffect(() => {
    if (org) {
      setPlan(org.plan);
      setSubscriptionPrice(String(org.subscriptionPrice ?? 0));
    }
  }, [org]);

  const handleSavePlan = async () => {
    await updatePlan.mutateAsync({
      id,
      plan,
      subscriptionPrice: parseFloat(subscriptionPrice) || 0,
      subscriptionType: org?.subscriptionType ?? "onetime",
    });
  };

  const handleDelete = async () => {
    if (!org || !confirm(`Delete "${org.name}"? This cannot be undone.`)) {
      return;
    }
    await deleteOrg.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="text-center py-24 text-slate-400">
        Organization not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button
          variant="ghost"
          className="text-slate-400 mb-4"
          onClick={() => router.push("/platform/organizations")}
        >
          ← Back to organisations
        </Button>
        <h1 className="text-2xl font-bold text-white">{org.name}</h1>
        <p className="text-slate-400 mt-1">{org.slug}</p>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Organization Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Subdomain</span>
            <span className="text-slate-200">{org.subdomain}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Users</span>
            <span className="text-slate-200">{org.userCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Courses</span>
            <span className="text-slate-200">{org.batchCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status</span>
            <span className="text-slate-200">
              {org.isActive ? "Active" : "Suspended"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Created</span>
            <span className="text-slate-200">
              {new Date(org.createdAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Plan</CardTitle>
          <CardDescription className="text-slate-400">
            Update subscription plan and pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Subscription Price (TND)</Label>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={subscriptionPrice}
              onChange={(e) => setSubscriptionPrice(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>
          <Button
            onClick={handleSavePlan}
            disabled={updatePlan.isPending}
          >
            {updatePlan.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Plan"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Maintenance Mode</CardTitle>
          <CardDescription className="text-slate-400">
            When enabled, the organization site shows a maintenance page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              checked={org.maintenanceMode}
              onCheckedChange={(checked) =>
                toggleMaintenance.mutate({ id, maintenanceMode: checked })
              }
            />
            <span className="text-sm text-slate-300">
              {org.maintenanceMode ? "Enabled" : "Disabled"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-900/50 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
          <CardDescription className="text-slate-400">
            Permanently delete this organization and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteOrg.isPending}
          >
            {deleteOrg.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Organization"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
