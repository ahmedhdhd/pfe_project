"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useUpdateBatchCertificateConfig } from "@/hooks";
import {
  CERTIFICATE_TEMPLATES,
  DEFAULT_CERTIFICATE_TEMPLATE_ID,
  type CertificateTemplateId,
} from "@/lib/certificate-templates";
import type { Batch } from "./types";

interface CourseCertificateTabProps {
  courseId: string;
  course: Batch;
  canManageCourse: boolean;
}

interface CertificateFormState {
  enabled: boolean;
  templateId: CertificateTemplateId;
}

const createInitialState = (course: Batch): CertificateFormState => ({
  enabled: Boolean(course.certificate?.enabled),
  templateId:
    (course.certificate?.templateId as CertificateTemplateId | undefined) ||
    DEFAULT_CERTIFICATE_TEMPLATE_ID,
});

export function CourseCertificateTab({
  courseId,
  course,
  canManageCourse,
}: CourseCertificateTabProps) {
  const [form, setForm] = useState<CertificateFormState>(() =>
    createInitialState(course)
  );
  const updateCertificate = useUpdateBatchCertificateConfig();

  useEffect(() => {
    setForm(createInitialState(course));
  }, [course]);

  const handleSave = async () => {
    try {
      await updateCertificate.mutateAsync({
        id: courseId,
        data: {
          enabled: form.enabled,
          templateId: form.templateId,
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

  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr,0.95fr]">
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

          <div className="space-y-3">
            <div>
              <p className="font-medium text-foreground">
                Choose a certificate template
              </p>
              <p className="text-sm text-muted-foreground">
                The final PDF automatically uses your platform name and colors.
                The signer name is taken from the teacher or admin who created
                the course.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {CERTIFICATE_TEMPLATES.map((template, index) => {
                const isSelected = form.templateId === template.id;

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        templateId: template.id,
                      }))
                    }
                    disabled={!canManageCourse || isSaving}
                    className={cn(
                      "group rounded-2xl border p-4 text-left transition",
                      "hover:border-primary/60 hover:bg-muted/20",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border/70"
                    )}
                  >
                    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-white">
                      <div
                        className={cn(
                          "h-36 w-full relative",
                          index === 0 &&
                            "bg-slate-950 before:absolute before:inset-1 before:border before:border-amber-500/50",
                          index === 1 &&
                            "bg-gradient-to-br from-cyan-500 to-blue-600",
                          index === 2 &&
                            "bg-gradient-to-tr from-orange-500 via-rose-500 to-purple-600",
                          index === 3 &&
                            "bg-emerald-950 before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] before:from-emerald-400/20 before:to-transparent"
                        )}
                      >
                        <div className="relative flex h-full flex-col justify-between p-4 z-10">
                          <div className={cn(
                            "flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.24em]",
                            index === 0 ? "text-amber-500" : "text-white/80"
                          )}>
                            <span>TeslaAcademy</span>
                            {isSelected ? (
                              <CheckCircle2 className={cn("h-4 w-4", index === 0 ? "text-amber-500" : "text-white")} />
                            ) : null}
                          </div>

                          <div className="space-y-2 text-center">
                            <div className={cn(
                              "text-xs uppercase tracking-[0.25em]",
                              index === 0 ? "text-amber-500/70" : "text-white/70"
                            )}>
                              Certificate
                            </div>
                            <div className={cn(
                              "text-lg font-semibold",
                              index === 0 ? "text-amber-50" : "text-white"
                            )}>
                              {template.name}
                            </div>
                            <div className={cn(
                              "text-xs",
                              index === 0 ? "text-amber-500/80" : "text-white/80"
                            )}>
                              Student Name
                            </div>
                          </div>

                          <div className={cn(
                            "flex items-center justify-between text-xs",
                            index === 0 ? "text-amber-500/60" : "text-white/60"
                          )}>
                            <span>Course Title</span>
                            <span>Signer</span>
                          </div>
                        </div>
                      </div>
                    </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Automatic Certificate Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
            <p className="font-medium text-foreground">Filled automatically</p>
            <ul className="mt-3 space-y-2">
              <li>Platform name comes from your organization settings.</li>
              <li>Certificate colors follow the platform theme colors.</li>
              <li>The signer name comes from the teacher or admin who created the course.</li>
              <li>Students unlock the certificate after finishing all video lessons.</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-background px-4 py-4">
            <p className="font-medium text-foreground">Current status</p>
            <div className="mt-3 space-y-2">
              <p>
                Template:{" "}
                <span className="text-foreground">
                  {
                    CERTIFICATE_TEMPLATES.find(
                      (template) => template.id === form.templateId
                    )?.name
                  }
                </span>
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
  );
}
