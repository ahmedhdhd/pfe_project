"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVerifyBatchPayment, useVerifySubscription } from "@/hooks/api";
import { useClientVerifyPayment } from "@/hooks/test-series-client";
import { useStudentCourseCartStore } from "@/lib/store/student-course-cart";

type CallbackState = "loading" | "success" | "pending" | "failed" | "error";
type PaymentType = "batch" | "test-series" | "subscription";

export default function FlouciPaymentCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyBatchPayment = useVerifyBatchPayment();
  const verifyTestSeriesPayment = useClientVerifyPayment();
  const verifySubscriptionPayment = useVerifySubscription();
  const removeCartItem = useStudentCourseCartStore((state) => state.removeItem);
  const removeCartItems = useStudentCourseCartStore((state) => state.removeItems);

  const [state, setState] = useState<CallbackState>("loading");
  const [message, setMessage] = useState("We are confirming your payment.");

  const orderId = searchParams.get("orderId");
  const type = searchParams.get("type") as PaymentType | null;
  const entityId = searchParams.get("entityId");

  const backHref =
    type === "batch" && entityId
      ? `/student/batches/${entityId}`
      : type === "test-series" && entityId
      ? `/student/test-series/${entityId}`
      : type === "subscription"
      ? "/student"
      : "/student";

  useEffect(() => {
    let active = true;

    const verifyPayment = async () => {
      if (
        !orderId ||
        (type !== "batch" &&
          type !== "test-series" &&
          type !== "subscription")
      ) {
        setState("error");
        setMessage("This payment return link is missing the required details.");
        return;
      }

      try {
        const response =
          type === "batch"
            ? await verifyBatchPayment.mutateAsync({ orderId })
            : type === "subscription"
            ? await verifySubscriptionPayment.mutateAsync({ orderId })
            : await verifyTestSeriesPayment.mutateAsync({ orderId });

        if (!active) {
          return;
        }

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
            router.replace("/student/my-learning");
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
        if (!active) {
          return;
        }

        const errorMessage =
          error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response
            ? ((error.response as { data?: { message?: string } }).data
                ?.message ??
                "We could not confirm this payment right now.")
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
    orderId,
    router,
    type,
    entityId,
    removeCartItem,
    removeCartItems,
    verifyBatchPayment,
    verifySubscriptionPayment,
    verifyTestSeriesPayment,
  ]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {state === "loading" && (
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            )}
            {state === "success" && (
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            )}
            {state === "pending" && <Clock3 className="h-7 w-7 text-amber-600" />}
            {(state === "failed" || state === "error") && (
              <XCircle className="h-7 w-7 text-destructive" />
            )}
          </div>
          <CardTitle>
            {state === "loading" && "Confirming payment"}
            {state === "success" && "Payment successful"}
            {state === "pending" && "Payment pending"}
            {state === "failed" && "Payment not completed"}
            {state === "error" && "Verification error"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {state === "success" && (
            <Button asChild>
              <Link href="/student/my-learning">Go to My Learning</Link>
            </Button>
          )}

          {state !== "success" && (
            <Button asChild>
              <Link href={backHref}>Back to course</Link>
            </Button>
          )}

          {state === "pending" && (
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              disabled={
                verifyBatchPayment.isPending ||
                verifySubscriptionPayment.isPending ||
                verifyTestSeriesPayment.isPending
              }
            >
              Check again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
