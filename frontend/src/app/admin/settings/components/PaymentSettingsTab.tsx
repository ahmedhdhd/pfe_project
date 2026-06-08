"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  ShieldAlert,
  Gift,
  CreditCard,
  Crown,
  Check,
} from "lucide-react";
import { CreateOrganizationConfigData } from "@/lib/types/api";

interface PaymentSettingsTabProps {
  formData: CreateOrganizationConfigData;
  setFormData: Dispatch<SetStateAction<CreateOrganizationConfigData>>;
  // legacy props kept for backward compat — no longer used visually
  showRazorpayKeyId?: boolean;
  setShowRazorpayKeyId?: (value: boolean) => void;
  showRazorpayKeySecret?: boolean;
  setShowRazorpayKeySecret?: (value: boolean) => void;
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
    description:
      "Students pay individually for each course or test series.",
    icon: CreditCard,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-300 dark:border-blue-700",
    ring: "ring-blue-500/30",
  },
  {
    id: "subscription" as const,
    label: "Subscription",
    description:
      "Students pay once to unlock access to all courses and test series.",
    icon: Crown,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-700",
    ring: "ring-amber-500/30",
  },
];

const PAYMENT_GATEWAYS = [
  {
    id: "flouci" as const,
    label: "Flouci",
    description: "Flouci hosted checkout integration using public and secret keys.",
  },
  {
    id: "konnect" as const,
    label: "Konnect",
    description: "Direct Konnect hosted checkout integration.",
  },
];

export function PaymentSettingsTab({
  formData,
  setFormData,
}: PaymentSettingsTabProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWalletId, setShowWalletId] = useState(false);

  const currentMode = formData.paymentMode || "per_course";
  const needsPaidGateway = currentMode === "per_course" || currentMode === "subscription";
  const currentGateway = formData.paymentGateway || "konnect";

  return (
    <div className="space-y-6">
      {/* Payment Mode Selector */}
      <Card className="rounded-xl border-border/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Payment Mode</CardTitle>
          <CardDescription>
            Choose how students access your content. This setting applies to all
            courses and test series.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
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

      {/* Subscription Settings — only when subscription mode */}
      {currentMode === "subscription" && (
        <Card className="rounded-xl border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/40">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Subscription Settings</CardTitle>
                <CardDescription className="mt-0.5">
                  Configure the subscription billing type and pricing.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subscription Type Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Billing Type <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  {
                    id: "onetime" as const,
                    label: "One-time",
                    desc: "Pay once, access forever",
                    icon: "💎",
                  },
                  {
                    id: "monthly" as const,
                    label: "Monthly",
                    desc: "Renew every 30 days",
                    icon: "🔄",
                  },
                ]).map((opt) => {
                  const isSelected = (formData.subscriptionType || "onetime") === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          subscriptionType: opt.id,
                        }))
                      }
                      className={`relative flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-amber-400 dark:border-amber-600 bg-amber-100/50 dark:bg-amber-950/30 shadow-sm ring-2 ring-amber-400/20"
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute right-2 top-2">
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                      )}
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subscription Price */}
            <div className="space-y-2">
              <Label
                htmlFor="subscriptionPrice"
                className="text-sm font-medium"
              >
                Subscription Price ({formData.currency || "TND"}){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subscriptionPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.subscriptionPrice || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    subscriptionPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="e.g. 50"
                className="max-w-xs rounded-xl font-mono"
              />
              <p className="text-xs text-muted-foreground">
                {(formData.subscriptionType || "onetime") === "monthly"
                  ? "Students will pay this amount every month to maintain access to all courses and test series."
                  : "Students will pay this amount once to permanently unlock all courses and test series."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Free mode info */}
      {currentMode === "free" && (
        <Card className="rounded-xl border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
          <CardContent className="flex gap-3 p-4">
            <Gift className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Free Access Mode
              </p>
              <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-200">
                All courses and test series will be available for free. Students
                can enroll instantly without any payment. You don&apos;t need to
                configure Konnect credentials.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gateway selection and credentials */}
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
                <CardTitle className="text-lg">
                  Payment Gateway
                </CardTitle>
                <CardDescription className="mt-0.5">
                  Choose the provider used for paid checkout flows.
                </CardDescription>
              </div>
              <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-0">
                Required
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Gateway <span className="text-destructive">*</span>
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_GATEWAYS.map((gateway) => {
                  const selected = currentGateway === gateway.id;
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
                      className={`rounded-xl border-2 p-3 text-left transition ${
                        selected
                          ? "border-primary/70 bg-primary/5"
                          : "border-border/60 hover:border-border"
                      }`}
                    >
                      <p className="text-sm font-semibold">{gateway.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {gateway.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security Warning */}
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Security Notice
                </p>
                <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
                  Payment API credentials are sensitive. Never share them in public channels.
                </p>
              </div>
            </div>

            {currentGateway === "flouci" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="flouciPublicKey" className="text-sm font-medium">
                  Flouci Public Key <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="flouciPublicKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.razorpayKeyId || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        razorpayKeyId: e.target.value,
                      }))
                    }
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Flouci public key..."
                    className="font-mono text-sm pr-24 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? (
                      <span className="flex items-center gap-1 text-xs">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Show
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="flouciSecretKey" className="text-sm font-medium">
                  Flouci Secret Key <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="flouciSecretKey"
                    type={showWalletId ? "text" : "password"}
                    value={formData.razorpayKeySecret || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        razorpayKeySecret: e.target.value,
                      }))
                    }
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Flouci secret key..."
                    className="font-mono text-sm pr-24 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWalletId(!showWalletId)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-muted-foreground hover:text-foreground"
                  >
                    {showWalletId ? (
                      <span className="flex items-center gap-1 text-xs">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Show
                      </span>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  These fields reuse the existing secure credential storage for the legacy Flouci integration.
                </p>
              </div>
            </div>
            )}
            {currentGateway === "konnect" && (
            <div className="space-y-5">
              {/* Konnect API Key */}
              <div className="space-y-2">
                <Label htmlFor="konnectApiKey" className="text-sm font-medium">
                  Konnect API Key{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="konnectApiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.konnectApiKey || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        konnectApiKey: e.target.value,
                      }))
                    }
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    autoComplete="off"
                    data-lpignore="true"
                    spellCheck={false}
                    placeholder="e.g. 66b3a9f8e4b0c2d1a5f6..."
                    className="font-mono text-sm pr-24 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? (
                      <span className="flex items-center gap-1 text-xs">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Show
                      </span>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Found in your{" "}
                  <a
                    href="https://app.konnect.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Konnect Dashboard
                  </a>{" "}
                  → Settings → API Keys
                </p>
              </div>

              {/* Konnect Wallet ID */}
              <div className="space-y-2">
                <Label
                  htmlFor="konnectWalletId"
                  className="text-sm font-medium"
                >
                  Receiver Wallet ID{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="konnectWalletId"
                    type={showWalletId ? "text" : "password"}
                    value={formData.konnectWalletId || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        konnectWalletId: e.target.value,
                      }))
                    }
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="e.g. 64f2b1c3e8a9d4f7..."
                    className="font-mono text-sm pr-24 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWalletId(!showWalletId)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-muted-foreground hover:text-foreground"
                  >
                    {showWalletId ? (
                      <span className="flex items-center gap-1 text-xs">
                        <EyeOff className="h-3.5 w-3.5" /> Hide
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs">
                        <Eye className="h-3.5 w-3.5" /> Show
                      </span>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your Konnect wallet ID — payments will be deposited into this
                  wallet.
                </p>
              </div>
            </div>
            )}

            {/* How it works */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                How{" "}
                {currentMode === "subscription"
                  ? "subscriptions work"
                  : "per-course payments work"}
              </p>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-none">
                {currentMode === "subscription" ? (
                  <>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        1
                      </span>
                      Student registers and is prompted to subscribe
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        2
                      </span>
                      Student pays the subscription fee via the selected gateway
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        3
                      </span>
                      After payment, all courses and test series are unlocked
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        1
                      </span>
                      Student clicks Enroll → backend initializes gateway checkout
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        2
                      </span>
                      Student is redirected to the selected gateway&apos;s secure checkout
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                        3
                      </span>
                      After payment, enrollment is activated automatically
                    </li>
                  </>
                )}
              </ol>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
