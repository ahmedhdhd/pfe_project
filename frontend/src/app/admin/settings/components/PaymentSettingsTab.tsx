"use client";

import { Dispatch, SetStateAction } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Gift, CreditCard, Check } from "@/components/icons";
import { CreateOrganizationConfigData } from "@/lib/types/api";

interface PaymentSettingsTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
}

const PAYMENT_MODES = [
  {
    id: "free" as const,
    label: "Free Access",
    description: "All courses and test series are free. No payment required.",
    icon: Gift,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-300 dark:border-emerald-700",
    ring: "ring-emerald-500/30",
  },
  {
    id: "per_course" as const,
    label: "Per Course",
    description: "Students pay individually for each course or test series.",
    icon: CreditCard,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-700",
    ring: "ring-blue-500/30",
  },
];

export function PaymentSettingsTab({
  formData,
  setFormData,
}: PaymentSettingsTabProps) {
  const currentMode = formData.paymentMode || "per_course";
  const needsPaidGateway = currentMode === "per_course";

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Payment Mode</CardTitle>
          <CardDescription>
            Choose how students access your content. This setting applies to all courses and test series.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAYMENT_MODES.map((mode) => {
              const isSelected = currentMode === mode.id;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentMode: mode.id,
                    }))
                  }
                  className={`relative flex flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? `${mode.border} ${mode.bg} shadow-sm ring-2 ${mode.ring}`
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute right-2 top-2">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isSelected ? mode.bg : "bg-muted/50"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isSelected ? mode.color : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isSelected ? "text-foreground" : "text-foreground/80"
                      }`}
                    >
                      {mode.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {currentMode === "free" && (
        <Card className="rounded-xl border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="flex gap-3 p-4">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Free Access Mode
              </p>
              <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-200">
                All courses and test series will be available for free. Students can enroll instantly without any payment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {needsPaidGateway && (
        <Card className="rounded-xl border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <svg
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"
                  />
                </svg>
              </div>
              <div>
                <CardTitle className="text-lg">Payment Gateway</CardTitle>
                <CardDescription className="mt-0.5">
                  Konnect is managed globally from the backend environment.
                </CardDescription>
              </div>
              <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-0">
                Konnect
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Security Notice
                </p>
                <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
                  Payment credentials live in the backend `.env` file so every organization shares the same Konnect setup.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                Global Konnect configuration
              </p>
              <p className="text-sm text-muted-foreground">
                Paid checkout uses the shared Konnect API key and wallet ID from the backend environment for every organization.
                Org admins can manage pricing and payment mode, but not the payment credentials.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                How per-course payments work
              </p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    1
                  </span>
                  Student clicks Enroll and the backend initializes Konnect checkout
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    2
                  </span>
                  Student is redirected to Konnect&apos;s secure checkout
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    3
                  </span>
                  After payment, enrollment is activated automatically
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
