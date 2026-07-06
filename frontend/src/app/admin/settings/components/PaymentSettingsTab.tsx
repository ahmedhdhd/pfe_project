"use client";

import { Dispatch, SetStateAction } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, CreditCard, Check } from "@/components/icons";
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
            <CardTitle className="text-lg">Manual Payment Methods</CardTitle>
            <CardDescription>
              Shown to students at checkout when they choose to pay by mandat
              minute or bank transfer.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mandat-minute-recipient">
                Mandat minute — recipient name
              </Label>
              <Input
                id="mandat-minute-recipient"
                value={formData.mandatMinuteRecipient || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    mandatMinuteRecipient: e.target.value,
                  }))
                }
                placeholder="Full name of the person receiving the mandat minute"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-transfer-rib">
                Bank transfer — RIB
              </Label>
              <Input
                id="bank-transfer-rib"
                value={formData.bankTransferRib || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bankTransferRib: e.target.value,
                  }))
                }
                placeholder="e.g. 08 006 0123456789012345 12"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Students will see this account number to make their bank
                transfer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
