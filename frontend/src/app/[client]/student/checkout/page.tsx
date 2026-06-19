"use client";

import Link from "next/link";
import Image from "next/image";
import { type ChangeEvent, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2, ShieldCheck } from "@/components/icons";
import { toast } from "sonner";
import { StudentHeader } from "@/components/student/student-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useCreateCourseOrderCheckout, useGetExploreBatch } from "@/hooks";
import { tokenManager } from "@/lib/api/client";
import {
  useStudentCourseCartItems,
  useStudentCourseCartStore,
} from "@/lib/store/student-course-cart";
import { useOrgCurrency, useOrgPaymentMode } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";

type PaymentMethod = "gateway" | "bank_transfer" | "mandat_minute_poste";

type CheckoutItem = {
  id: string;
  title: string;
  imageUrl?: string;
  category?: string | null;
  language?: string | null;
  totalPrice: number;
  discountPercentage: number;
  finalPrice: number;
};

export default function StudentCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientSlug = params.client as string | undefined;
  const courseId = searchParams.get("courseId");
  const cartItems = useStudentCourseCartItems();
  const removeItems = useStudentCourseCartStore((state) => state.removeItems);
  const currency = useOrgCurrency();
  const paymentMode = useOrgPaymentMode();
  const checkoutMutation = useCreateCourseOrderCheckout();
  const user = tokenManager.getUser();
  const { data: singleCourseResponse, isLoading: isSingleCourseLoading } =
    useGetExploreBatch(courseId || "", clientSlug);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gateway");
  const [billing, setBilling] = useState({
    firstName: "",
    lastName: "",
    enterprise: "",
    taxNumber: "",
    region: "",
    phone: "",
    email: user?.email || "",
  });

  const checkoutItems = useMemo<CheckoutItem[]>(() => {
    if (courseId) {
      const existing = cartItems.find((item) => item.id === courseId);
      if (existing) {
        return [existing];
      }

      const batch = singleCourseResponse?.data;
      if (!batch) return [];

      const finalPrice = Math.round(
        batch.totalPrice * (1 - batch.discountPercentage / 100)
      );

      return [
        {
          id: batch.id,
          title: batch.name,
          imageUrl: batch.imageUrl,
          category: batch.category?.name || null,
          language: batch.language || null,
          totalPrice: batch.totalPrice,
          discountPercentage: batch.discountPercentage,
          finalPrice,
        },
      ];
    }

    return cartItems;
  }, [cartItems, courseId, singleCourseResponse?.data]);

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.finalPrice, 0);
  const total = subtotal;

  const handleChange =
    (field: keyof typeof billing) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setBilling((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async () => {
    if (!checkoutItems.length) {
      toast.error("There are no courses to checkout.");
      return;
    }

    if (
      !billing.firstName.trim() ||
      !billing.lastName.trim() ||
      !billing.region.trim() ||
      !billing.phone.trim() ||
      !billing.email.trim()
    ) {
      toast.error("Please complete the required billing fields.");
      return;
    }

    try {
      toast.loading("Preparing your order...");
      const response = await checkoutMutation.mutateAsync({
        batchIds: checkoutItems.map((item) => item.id),
        paymentMethod,
        billing: {
          firstName: billing.firstName,
          lastName: billing.lastName,
          enterprise: billing.enterprise || undefined,
          taxNumber: billing.taxNumber || undefined,
          region: billing.region,
          phone: billing.phone,
          email: billing.email,
        },
      });

      toast.dismiss();

      if (!response.success || !response.data) {
        toast.error(response.message || "Unable to create the order.");
        return;
      }

      if (paymentMethod === "gateway") {
        const checkoutUrl = response.data.payUrl || response.data.paymentLink;
        if (!checkoutUrl) {
          toast.error("The payment gateway did not return a checkout link.");
          return;
        }

        window.location.assign(checkoutUrl);
        return;
      }

      removeItems(checkoutItems.map((item) => item.id));
      toast.success("Order created. Upload your proof in the orders page.");
      router.push("/student/orders");
    } catch (error) {
      toast.dismiss();
      const errorMessage =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response
          ? ((error.response as { data?: { message?: string } }).data?.message ??
              "Unable to create the order.")
          : error instanceof Error
          ? error.message
          : "Unable to create the order.";

      toast.error(errorMessage);
    }
  };

  if (paymentMode !== "per_course") {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-lg font-semibold">Checkout is not available</p>
              <p className="text-sm text-muted-foreground">
                This organization is not currently using per-course payments.
              </p>
              <Button asChild>
                <Link href="/student/explore">Back to Explore</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isSingleCourseLoading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-muted-foreground">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Loading checkout...
          </div>
        </div>
      </div>
    );
  }

  if (!checkoutItems.length) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-lg font-semibold">No course selected</p>
              <p className="text-sm text-muted-foreground">
                Add one or more courses to the cart before opening checkout.
              </p>
              <Button asChild>
                <Link href="/student/cart">Back to cart</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" asChild className="px-0">
            <Link href={courseId ? `/student/batches/${courseId}` : "/student/cart"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        </div>

        <div className="mb-8 space-y-2">
          <p className="text-sm font-medium text-primary">Checkout</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Complete your order
          </h1>
          <p className="text-sm text-muted-foreground">
            Fill in your information, review your courses, then choose how you
            want to pay.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Billing information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Firstname</Label>
                  <Input
                    id="firstName"
                    value={billing.firstName}
                    onChange={handleChange("firstName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Lastname</Label>
                  <Input
                    id="lastName"
                    value={billing.lastName}
                    onChange={handleChange("lastName")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enterprise">Enterprise (optional)</Label>
                  <Input
                    id="enterprise"
                    value={billing.enterprise}
                    onChange={handleChange("enterprise")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Matricule fiscal (optional)</Label>
                  <Input
                    id="taxNumber"
                    value={billing.taxNumber}
                    onChange={handleChange("taxNumber")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={billing.region}
                    onChange={handleChange("region")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telephone</Label>
                  <Input
                    id="phone"
                    value={billing.phone}
                    onChange={handleChange("phone")}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={billing.email}
                    onChange={handleChange("email")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order detail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {checkoutItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 rounded-xl border border-border/60 p-4 md:grid-cols-[120px_1fr_auto]"
                  >
                    <div className="relative h-24 overflow-hidden rounded-lg bg-muted">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium">{item.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {item.category ? <span>{item.category}</span> : null}
                        {item.language ? <span>{item.language}</span> : null}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.discountPercentage > 0 ? (
                        <p className="text-sm text-muted-foreground line-through">
                          {formatCurrency(item.totalPrice, currency)}
                        </p>
                      ) : null}
                      <p className="text-lg font-semibold text-primary">
                        {formatCurrency(item.finalPrice, currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {checkoutItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="line-clamp-2 text-muted-foreground">
                        {item.title}
                      </span>
                      <span className="shrink-0 font-medium">
                        {formatCurrency(item.finalPrice, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-xl font-semibold text-primary">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Payment way</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value) =>
                      setPaymentMethod(value as PaymentMethod)
                    }
                    className="space-y-3"
                  >
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-4">
                      <RadioGroupItem value="gateway" id="payment-gateway" />
                      <div className="space-y-1">
                        <p className="font-medium">Gateway</p>
                        <p className="text-sm text-muted-foreground">
                          Pay directly using the organization payment gateway.
                        </p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-4">
                      <RadioGroupItem
                        value="bank_transfer"
                        id="payment-bank-transfer"
                      />
                      <div className="space-y-1">
                        <p className="font-medium">Virement bancaire</p>
                        <p className="text-sm text-muted-foreground">
                          Create the order first, then upload your payment proof.
                        </p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-4">
                      <RadioGroupItem
                        value="mandat_minute_poste"
                        id="payment-mandat"
                      />
                      <div className="space-y-1">
                        <p className="font-medium">Mandat minute poste</p>
                        <p className="text-sm text-muted-foreground">
                          Create the order first, then upload the justification
                          image from the orders page.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>

                <Separator />

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : paymentMethod === "gateway" ? (
                    "Pay"
                  ) : (
                    "Pay"
                  )}
                </Button>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>
                      Manual payment methods require an uploaded proof before the
                      course can be opened.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <span>
                      Once the admin validates the order, the course unlocks
                      automatically in your learning space.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
