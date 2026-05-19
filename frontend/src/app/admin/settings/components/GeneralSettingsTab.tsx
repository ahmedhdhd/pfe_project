"use client";

import { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateOrganizationConfigData } from "@/lib/types/api";

interface GeneralSettingsTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
}

export function GeneralSettingsTab({
  formData,
  setFormData,
}: GeneralSettingsTabProps) {
  const selectedCurrency = ["TND", "USD", "EUR"].includes(
    formData.currency || ""
  )
    ? formData.currency
    : "USD";

  return (
    <Card>
      <CardHeader>
        <CardTitle>General Information</CardTitle>
        <CardDescription>
          Basic information about your organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 border rounded-lg">
          <p className="text-sm text-muted-foreground">
            To edit Organization Name, Slug, or Domain, please contact{" "}
            <a
              href="mailto:admin@teslaacademy.com"
              className="text-primary hover:underline font-medium"
            >
              admin@teslaacademy.com
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">
            Organization Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            disabled
            className="bg-muted cursor-not-allowed"
            placeholder="Your Organization Name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">
            Slug <span className="text-red-500">*</span>
          </Label>
          <Input
            id="slug"
            value={formData.slug}
            disabled
            className="bg-muted cursor-not-allowed"
            placeholder="your-org-slug"
          />
          <p className="text-xs text-muted-foreground">
            Used in URLs: {formData.slug || "your-org"}.teslaacademy.com
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            value={formData.domain || ""}
            disabled
            className="bg-muted cursor-not-allowed"
            placeholder="yourdomain.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={selectedCurrency}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, currency: value }))
            }
          >
            <SelectTrigger id="currency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TND">TND</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
