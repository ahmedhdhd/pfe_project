"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, XCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVerifyBatchKonnectPayment, useVerifySubscription } from "@/hooks/api";
import { useClientVerifyKonnectPayment } from "@/hooks/test-series-client";
import { useStudentCourseCartStore } from "@/lib/store/student-course-cart";

type CallbackState = "loading" | "success" | "pending" | "failed" | "error";
type PaymentType = "batch" | "test-series" | "subscription";

export default function KonnectPaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyBatchPayment = useVerifyBatchKonnectPayment();
  const verifyTestSeriesPayment = useClientVerifyKonnectPayment();
  const verifySubscription = useVerifySubscription();
  const removeCartItem = useStudentCourseCartStore((state) => state.removeItem);
  const removeCartItems = useStudentCourseCartStore((state) => state.removeItems);

  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("We are confirming your payment.");

  // Konnect returns payment_ref in the query string
  const paymentRef = searchParams.get("payment_ref");
  const type = searchParams.get("type") as PaymentType | null;
  const entityId = searchParams.get("entityId");

  const backHref =
    type === "subscription"
      ? "/student/explore"
      : type === "batch" && entityId
      ? `/student/batches/${entityId}`
      : type === "test-series" && entityId
      ? `/student/test-series/${entityId}`
      : "/student";

  useEffect(() => {
    let active = true;

    const verifyPayment = async () => {
      if (
        !paymentRef ||
        (type !== "batch" && type !== "test-series" && type !== "subscription")
      ) {
        setState("error");
        setMessage("This payment return link is missing the required details.");
        return;
      }

      try {
        const response =
          type === "batch"
            ? await verifyBatchPayment.mutateAsync({ paymentRef })
            : type === "subscription"
              ? await verifySubscription.mutateAsync({ paymentRef })
              : await verifyTestSeriesPayment.mutateAsync({ paymentRef });

        if (!active) return;

        const result = response.data;

        if (response.success && result?.verified) {
          if (type === "batch") {
            const enrolledBatchIds =
              result &&
              typeof result === "object" &&
              "enrolledBatchIds" in result &&
              Array.isArray((result as { enrolledBatchIds?: string[] }).enrolledBatchIds)
                ? ((result as { enrolledBatchIds?: string[] }).enrolledBatchIds as string[])
                : [];

            if (enrolledBatchIds.length > 0) {
              removeCartItems(enrolledBatchIds);
            } else if (entityId) {
              removeCartItem(entityId);
            }
          }
          setState("success");
          setMessage(result.message || "Payment confirmed successfully.");
          window.setTimeout(() => {
            router.replace(type === "subscription" ? "/student/explore" : "/student/my-learning");
          }, 1500);
          return;
        }

        if (result?.status === "PENDING") {
          setState("pending");
          setMessage(
            result.message ||
              "Your payment is still pending. Please wait a moment and try again."
          );
          return;
        }

        setState("failed");
        setMessage(
          result?.message || "The payment was not completed successfully."
        );
      } catch (error) {
        if (!active) return;

        const errorMessage =
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response
            ? ((error.response as { data?: { message?: string } }).data
                ?.message ?? "We could not confirm this payment right now.")
            : error instanceof Error
            ? error.message
            : "We could not confirm this payment right now.";

        setState("error");
        setMessage(errorMessage);
      }
    };

    void verifyPayment();

    return () => {
      active = false;
    };
  }, [
    paymentRef,
    router,
    type,
    entityId,
    removeCartItem,
    removeCartItems,
    verifyBatchPayment,
    verifySubscription,
    verifyTestSeriesPayment,
  ]);

  const iconClasses = "h-7 w-7";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-lg rounded-2xl shadow-lg border-border/60">
        <CardHeader className="text-center pb-4">
          <div
            className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
              state === "loading"
                ? "bg-primary/10"
                : state === "success"
                ? "bg-green-100 dark:bg-green-950/30"
                : state === "pending"
                ? "bg-amber-100 dark:bg-amber-950/30"
                : "bg-destructive/10"
            }`}
          >
            {state === "loading" && (
              <Loader2 className={`${iconClasses} animate-spin text-primary`} />
            )}
            {state === "success" && (
              <CheckCircle2 className={`${iconClasses} text-green-600`} />
            )}
            {state === "pending" && (
              <Clock3 className={`${iconClasses} text-amber-600`} />
            )}
            {(state === "failed" || state === "error") && (
              <XCircle className={`${iconClasses} text-destructive`} />
            )}
          </div>
          <CardTitle className="text-xl">
            {state === "loading" && "Confirming payment"}
            {state === "success" && "Payment successful!"}
            {state === "pending" && "Payment pending"}
            {state === "failed" && "Payment not completed"}
            {state === "error" && "Verification error"}
          </CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 px-6 pb-6">
          {state === "success" && (
            <Button asChild className="rounded-xl">
              <Link href="/student/my-learning">Go to My Learning</Link>
            </Button>
          )}

          {state !== "success" && (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={backHref}>Back to course</Link>
            </Button>
          )}

          {state === "pending" && (
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              disabled={
                verifyBatchPayment.isPending || verifyTestSeriesPayment.isPending
              }
              className="rounded-xl"
            >
              Check again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
