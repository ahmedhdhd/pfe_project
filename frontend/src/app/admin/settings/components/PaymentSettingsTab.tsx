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
import { api } from "@/lib/api/client";
import { toast } from "sonner";

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

const PAYMENT_GATEWAYS = [
  {
    id: "KONNECT" as const,
    label: "Konnect",
    description: "Keep the current shared Konnect setup.",
  },
  {
    id: "STRIPE_CONNECT" as const,
    label: "Stripe Connect",
    description: "Let this organization connect its own Stripe account.",
  },
];

export function PaymentSettingsTab({
  formData,
  setFormData,
}: PaymentSettingsTabProps) {
  const currentMode = formData.paymentMode || "per_course";
  const currentGateway = formData.paymentGateway || "KONNECT";
  const needsPaidGateway = currentMode === "per_course";

  const handleConnectStripe = async () => {
    try {
      const response = await api.startStripeConnect();
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to start Stripe Connect");
      }

      const data = response.data?.data;

      // Test mode: account was created & linked server-side – no redirect needed
      if (data?.testMode) {
        setFormData((prev) => ({
          ...prev,
          paymentGateway: "STRIPE_CONNECT",
          stripeChargesEnabled: data.stripeChargesEnabled ?? false,
          stripePayoutsEnabled: data.stripePayoutsEnabled ?? false,
          stripeDetailsSubmitted: data.stripeDetailsSubmitted ?? false,
          stripeConnectedAt: new Date().toISOString(),
        }));
        toast.success(
          response.data?.message || "Test Stripe account connected successfully"
        );
        return;
      }

      // Normal OAuth flow – redirect to Stripe
      const url = data?.url;
      if (!url) {
        throw new Error("Failed to start Stripe Connect");
      }
      window.location.assign(url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start Stripe Connect"
      );
    }
  };

  const handleDisconnectStripe = async () => {
    try {
      const response = await api.disconnectStripeConnect();
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to disconnect Stripe");
      }
      setFormData((prev) => ({
        ...prev,
        paymentGateway: "KONNECT",
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
        stripeDetailsSubmitted: false,
        stripeConnectedAt: undefined,
      }));
      toast.success("Stripe account disconnected");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect Stripe"
      );
    }
  };

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
                  Choose Konnect or let this organization connect its own Stripe account.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_GATEWAYS.map((gateway) => {
                const isSelected = currentGateway === gateway.id;
                return (
                  <button
                    key={gateway.id}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentGateway: gateway.id,
                      }))
                    }
                    className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
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
                    <p className="text-sm font-semibold">{gateway.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {gateway.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {currentGateway === "KONNECT" ? (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Konnect mode
                  </p>
                  <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
                    The current checkout flow stays on the shared Konnect setup.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                      Stripe Connect
                    </p>
                    <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-200">
                      Connect the organization&apos;s Stripe account and keep the checkout branded to that account.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    Connection status
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.stripeDetailsSubmitted
                      ? "Stripe account connected."
                      : "Stripe account not connected yet."}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant={formData.stripeChargesEnabled ? "default" : "secondary"}>
                      Charges {formData.stripeChargesEnabled ? "enabled" : "disabled"}
                    </Badge>
                    <Badge variant={formData.stripePayoutsEnabled ? "default" : "secondary"}>
                      Payouts {formData.stripePayoutsEnabled ? "enabled" : "disabled"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stripe checkout works best with USD or EUR in this codebase.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleConnectStripe}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Connect Stripe
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectStripe}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
