"use client";

import { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateOrganizationConfigData } from "@/lib/types/api";

interface ContactSettingsTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
  onSocialLinkChange: (platform: string, value: string) => void;
}

export function ContactSettingsTab({
  formData,
  setFormData,
  onSocialLinkChange,
}: ContactSettingsTabProps) {
  const platforms = ["facebook", "instagram", "twitter", "linkedin", "youtube"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
        <CardDescription>Contact details for your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contactEmail: e.target.value,
              }))
            }
            placeholder="contact@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            value={formData.contactPhone || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                contactPhone: e.target.value,
              }))
            }
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="supportEmail">Support Email</Label>
          <Input
            id="supportEmail"
            type="email"
            value={formData.supportEmail || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                supportEmail: e.target.value,
              }))
            }
            placeholder="support@example.com"
          />
          <p className="text-xs text-muted-foreground">
            Email address for customer support inquiries
          </p>
        </div>

        <div className="space-y-2">
          <Label>Social Links</Label>
          <p className="text-xs text-muted-foreground">
            Add links to your social profiles (optional)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {platforms.map((platform) => (
              <div key={platform} className="space-y-1">
                <Label
                  htmlFor={`social-${platform}`}
                  className="text-xs capitalize"
                >
                  {platform}
                </Label>
                <Input
                  id={`social-${platform}`}
                  value={formData.socialLinks?.[platform] || ""}
                  onChange={(e) => onSocialLinkChange(platform, e.target.value)}
                  placeholder={`https://${platform}.com/your-page`}
                />
              </div>
            ))}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
