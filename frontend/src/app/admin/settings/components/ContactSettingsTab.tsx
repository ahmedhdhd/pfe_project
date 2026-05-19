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

        <div className="space-y-3 rounded-xl border border-border/70 p-4">
          <div>
            <Label className="text-sm font-medium">SMTP Configuration</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              These credentials are used for organization emails like
              announcements, verification, and password reset.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="smtp-host" className="text-xs">
                SMTP Host
              </Label>
              <Input
                id="smtp-host"
                value={formData.smtpConfig?.host || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    smtpConfig: {
                      host: e.target.value,
                      port: prev.smtpConfig?.port || 587,
                      user: prev.smtpConfig?.user || "",
                      pass: prev.smtpConfig?.pass || "",
                      from: prev.smtpConfig?.from || "",
                    },
                  }))
                }
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="smtp-port" className="text-xs">
                SMTP Port
              </Label>
              <Input
                id="smtp-port"
                type="number"
                value={formData.smtpConfig?.port || 587}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    smtpConfig: {
                      host: prev.smtpConfig?.host || "",
                      port: Number(e.target.value) || 587,
                      user: prev.smtpConfig?.user || "",
                      pass: prev.smtpConfig?.pass || "",
                      from: prev.smtpConfig?.from || "",
                    },
                  }))
                }
                placeholder="587"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="smtp-user" className="text-xs">
                SMTP Username
              </Label>
              <Input
                id="smtp-user"
                value={formData.smtpConfig?.user || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    smtpConfig: {
                      host: prev.smtpConfig?.host || "",
                      port: prev.smtpConfig?.port || 587,
                      user: e.target.value,
                      pass: prev.smtpConfig?.pass || "",
                      from: prev.smtpConfig?.from || "",
                    },
                  }))
                }
                placeholder="notifications@yourorg.com"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="smtp-pass" className="text-xs">
                SMTP Password
              </Label>
              <Input
                id="smtp-pass"
                type="password"
                value={formData.smtpConfig?.pass || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    smtpConfig: {
                      host: prev.smtpConfig?.host || "",
                      port: prev.smtpConfig?.port || 587,
                      user: prev.smtpConfig?.user || "",
                      pass: e.target.value,
                      from: prev.smtpConfig?.from || "",
                    },
                  }))
                }
                placeholder="App password"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="smtp-from" className="text-xs">
                From Address
              </Label>
              <Input
                id="smtp-from"
                value={formData.smtpConfig?.from || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    smtpConfig: {
                      host: prev.smtpConfig?.host || "",
                      port: prev.smtpConfig?.port || 587,
                      user: prev.smtpConfig?.user || "",
                      pass: prev.smtpConfig?.pass || "",
                      from: e.target.value,
                    },
                  }))
                }
                placeholder="TeslaAcademy <notifications@yourorg.com>"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
