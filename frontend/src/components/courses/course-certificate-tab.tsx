"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Loader2, Palette, ShieldCheck, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useOrganizationConfigAdmin, useUpdateBatchCertificateConfig } from "@/hooks";
import {
  CERTIFICATE_TEMPLATES,
  DEFAULT_CERTIFICATE_HEADING,
  DEFAULT_CERTIFICATE_TEMPLATE_ID,
  getCertificateTemplate,
  normalizeCertificateTemplateId,
  type CertificateTemplateId,
} from "@/lib/certificate-templates";
import { CertificateTemplatePreview } from "./certificate-template-preview";
import type { Batch } from "./types";

interface CourseCertificateTabProps {
  courseId: string;
  course: Batch;
  canManageCourse: boolean;
}

interface CertificateFormState {
  enabled: boolean;
  templateId: CertificateTemplateId;
  title: string;
  heading: string;
  issuerName: string;
  signerName: string;
  signerTitle: string;
  primaryColor: string;
  secondaryColor: string;
}

const createInitialState = (
  course: Batch,
  orgName: string,
  themePrimary?: string,
  themeSecondary?: string
): CertificateFormState => {
  const templateId = normalizeCertificateTemplateId(course.certificate?.templateId);
  const template = getCertificateTemplate(templateId);

  return {
    enabled: Boolean(course.certificate?.enabled),
    templateId,
    title: course.certificate?.title || `${course.name} Certificate`,
    heading: course.certificate?.heading || DEFAULT_CERTIFICATE_HEADING,
    issuerName: course.certificate?.issuerName || orgName || "TeslaAcademy",
    signerName: course.certificate?.signerName || "",
    signerTitle: course.certificate?.signerTitle || "Course Creator",
    primaryColor:
      course.certificate?.primaryColor ||
      themePrimary ||
      template.defaultPrimaryColor,
    secondaryColor:
      course.certificate?.secondaryColor ||
      themeSecondary ||
      template.defaultSecondaryColor,
  };
};

export function CourseCertificateTab({
  courseId,
  course,
  canManageCourse,
}: CourseCertificateTabProps) {
  const { data: orgConfigData } = useOrganizationConfigAdmin();
  const orgName = orgConfigData?.data?.name || "TeslaAcademy";
  const themePrimary = orgConfigData?.data?.theme?.primaryColor;
  const themeSecondary = orgConfigData?.data?.theme?.secondaryColor;

  const [form, setForm] = useState<CertificateFormState>(() =>
    createInitialState(course, orgName, themePrimary, themeSecondary)
  );
  const updateCertificate = useUpdateBatchCertificateConfig();

  useEffect(() => {
    setForm(createInitialState(course, orgName, themePrimary, themeSecondary));
  }, [course, orgName, themePrimary, themeSecondary]);

  const previewContent = useMemo(
    () => ({
      organizationName: form.issuerName || orgName,
      heading: form.heading || DEFAULT_CERTIFICATE_HEADING,
      recipientName: "Student Name",
      courseTitle: form.title || `${course.name} Certificate`,
      batchName: course.name,
      issuerName: form.issuerName || orgName,
      signerName: form.signerName || "Course Instructor",
      signerTitle: form.signerTitle || "Course Creator",
      primaryColor: form.primaryColor,
      secondaryColor: form.secondaryColor,
    }),
    [form, course.name, orgName]
  );

  const applyTemplateDefaults = (templateId: CertificateTemplateId) => {
    const template = getCertificateTemplate(templateId);
    setForm((current) => ({
      ...current,
      templateId,
      primaryColor: template.defaultPrimaryColor,
      secondaryColor: template.defaultSecondaryColor,
    }));
  };

  const handleSave = async () => {
    try {
      await updateCertificate.mutateAsync({
        id: courseId,
        data: {
          enabled: form.enabled,
          templateId: form.templateId,
          title: form.title.trim() || undefined,
          heading: form.heading.trim() || undefined,
          issuerName: form.issuerName.trim() || undefined,
          signerName: form.signerName.trim() || undefined,
          signerTitle: form.signerTitle.trim() || undefined,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
        },
      });
      toast.success("Certificate settings saved.");
    } catch (error) {
      console.error("Certificate settings save failed:", error);
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Failed to save certificate settings.";
      toast.error(message);
    }
  };

  const isSaving = updateCertificate.isPending;
  const selectedTemplate = getCertificateTemplate(form.templateId);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Course Certificate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-4">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Enable certificates</p>
                <p className="text-sm text-muted-foreground">
                  Students can claim a downloadable certificate after completing
                  every video lesson in this course.
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, enabled: checked }))
                }
                disabled={!canManageCourse || isSaving}
              />
            </div>

            <div className="space-y-4 rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                <p className="font-medium text-foreground">Certificate text</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cert-heading">Main heading</Label>
                  <Input
                    id="cert-heading"
                    value={form.heading}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        heading: event.target.value,
                      }))
                    }
                    placeholder={DEFAULT_CERTIFICATE_HEADING}
                    disabled={!canManageCourse || isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-title">Course line on certificate</Label>
                  <Input
                    id="cert-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder={`${course.name} Certificate`}
                    disabled={!canManageCourse || isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-issuer">Issuer name</Label>
                  <Input
                    id="cert-issuer"
                    value={form.issuerName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        issuerName: event.target.value,
                      }))
                    }
                    placeholder={orgName}
                    disabled={!canManageCourse || isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-signer">Signer name</Label>
                  <Input
                    id="cert-signer"
                    value={form.signerName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        signerName: event.target.value,
                      }))
                    }
                    placeholder="Leave empty to use course creator"
                    disabled={!canManageCourse || isSaving}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cert-signer-title">Signer role</Label>
                  <Input
                    id="cert-signer-title"
                    value={form.signerTitle}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        signerTitle: event.target.value,
                      }))
                    }
                    placeholder="Course Creator"
                    disabled={!canManageCourse || isSaving}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <p className="font-medium text-foreground">Colors</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cert-primary">Accent color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cert-primary"
                      type="color"
                      value={form.primaryColor}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          primaryColor: event.target.value,
                        }))
                      }
                      className="h-10 w-14 cursor-pointer px-1 py-1"
                      disabled={!canManageCourse || isSaving}
                    />
                    <Input
                      value={form.primaryColor}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          primaryColor: event.target.value,
                        }))
                      }
                      disabled={!canManageCourse || isSaving}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cert-secondary">Secondary color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cert-secondary"
                      type="color"
                      value={form.secondaryColor}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          secondaryColor: event.target.value,
                        }))
                      }
                      className="h-10 w-14 cursor-pointer px-1 py-1"
                      disabled={!canManageCourse || isSaving}
                    />
                    <Input
                      value={form.secondaryColor}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          secondaryColor: event.target.value,
                        }))
                      }
                      disabled={!canManageCourse || isSaving}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground">Choose a template</p>
                <p className="text-sm text-muted-foreground">
                  Pick a layout, then fine-tune the text and colors above.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {CERTIFICATE_TEMPLATES.map((template) => {
                  const isSelected = form.templateId === template.id;

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyTemplateDefaults(template.id)}
                      disabled={!canManageCourse || isSaving}
                      className={cn(
                        "group rounded-2xl border p-4 text-left transition",
                        "hover:border-primary/60 hover:bg-muted/20",
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border/70"
                      )}
                    >
                      <CertificateTemplatePreview
                        templateId={template.id}
                        content={{
                          ...previewContent,
                          primaryColor: isSelected
                            ? form.primaryColor
                            : template.defaultPrimaryColor,
                          secondaryColor: isSelected
                            ? form.secondaryColor
                            : template.defaultSecondaryColor,
                        }}
                        selected={isSelected}
                        compact
                      />
                      <div className="mt-3 space-y-1">
                        <p className="font-medium text-foreground">
                          {template.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canManageCourse || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Certificate Settings"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Live preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CertificateTemplatePreview
              templateId={form.templateId}
              content={previewContent}
              className="h-56"
            />
            <p className="text-sm text-muted-foreground">
              Previewing <span className="text-foreground">{selectedTemplate.name}</span>{" "}
              with your current text and colors. The downloaded PDF uses the student&apos;s
              real name when they claim the certificate.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
              <p className="font-medium text-foreground">Automatic fields</p>
              <ul className="mt-3 space-y-2">
                <li>Student name is filled when they claim the certificate.</li>
                <li>Issue date is generated automatically.</li>
                <li>
                  If signer name is empty, the course creator is used on the PDF.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-background px-4 py-4">
              <p className="font-medium text-foreground">Current status</p>
              <div className="mt-3 space-y-2">
                <p>
                  Template:{" "}
                  <span className="text-foreground">{selectedTemplate.name}</span>
                </p>
                <p>
                  Live for students:{" "}
                  <span className="text-foreground">
                    {form.enabled ? "Enabled" : "Disabled"}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
