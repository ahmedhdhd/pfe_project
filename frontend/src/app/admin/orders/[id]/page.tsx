"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  useAdminOrderById,
  useApproveAdminOrder,
  useRejectAdminOrder,
} from "@/hooks";
import {
  formatPaymentProvider,
  formatCurrency,
  formatDate,
  getEntityLabel,
  getStatusBadgeVariant,
} from "@/app/[client]/student/orders/utils/order-utils";

const MANUAL_PROVIDERS = ["BANK_TRANSFER", "MANDAT_MINUTE_POSTE"];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: response, isLoading } = useAdminOrderById(id);
  const approveOrder = useApproveAdminOrder();
  const rejectOrder = useRejectAdminOrder();
  const [note, setNote] = useState("");

  const order = response?.data;

  const handleApprove = async () => {
    if (!order) return;

    try {
      toast.loading("Validating order...");
      await approveOrder.mutateAsync({ id: order.id, note: note || undefined });
      toast.dismiss();
      toast.success("Order validated successfully.");
      router.refresh();
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
              "Unable to validate the order.")
          : error instanceof Error
          ? error.message
          : "Unable to validate the order.";

      toast.error(errorMessage);
    }
  };

  const handleReject = async () => {
    if (!order) return;

    try {
      toast.loading("Rejecting order...");
      await rejectOrder.mutateAsync({
        id: order.id,
        note: note || "Manual payment proof was rejected",
      });
      toast.dismiss();
      toast.success("Order rejected.");
      router.refresh();
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
              "Unable to reject the order.")
          : error instanceof Error
          ? error.message
          : "Unable to reject the order.";

      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading order...
      </div>
    );
  }

  if (!order) {
    return (
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-lg font-semibold">Order not found</p>
          <Button asChild>
            <Link href="/admin/orders">Back to orders</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isManualPayment = MANUAL_PROVIDERS.includes(order.paymentProvider);

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.receiptId || order.id}
        description="Review the order detail and validate the student's payment."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to orders
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student and order information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoLine label="Student" value={order.user?.username} />
              <InfoLine label="Email" value={order.user?.email || undefined} />
              <InfoLine label="Type" value={getEntityLabel(order.entityType)} />
              <InfoLine label="Payment way" value={formatPaymentProvider(order.paymentProvider)} />
              <InfoLine label="Created at" value={formatDate(order.createdAt)} />
              <InfoLine label="Total" value={formatCurrency(order.amount, order.currency)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Courses in this order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(order.items || []).map((item) => (
                <div
                  key={item.batchId}
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
                        <BookOpen className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-medium">{item.title}</h2>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.category ? <span>{item.category}</span> : null}
                      {item.language ? <span>{item.language}</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(item.finalPrice, order.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <InfoLine label="Firstname" value={order.billingInfo?.firstName} />
              <InfoLine label="Lastname" value={order.billingInfo?.lastName} />
              <InfoLine label="Enterprise" value={order.billingInfo?.enterprise} />
              <InfoLine label="Matricule fiscal" value={order.billingInfo?.taxNumber} />
              <InfoLine label="Region" value={order.billingInfo?.region} />
              <InfoLine label="Telephone" value={order.billingInfo?.phone} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusBadgeVariant(order.paymentStatus)}>
                  {order.paymentStatus}
                </Badge>
                {order.manualReviewStatus ? (
                  <Badge variant="secondary">{order.manualReviewStatus}</Badge>
                ) : null}
              </div>

              {order.failureReason ? (
                <>
                  <Separator />
                  <p className="text-sm text-destructive">{order.failureReason}</p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment proof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.proofImageUrl ? (
                <div className="overflow-hidden rounded-xl border border-border/60">
                  <div className="relative aspect-[4/3] w-full bg-muted">
                    <Image
                      src={order.proofImageUrl}
                      alt="Payment proof"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  No proof uploaded yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Review decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add an optional note for the student..."
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={5}
              />

              {isManualPayment ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={handleApprove}
                    disabled={approveOrder.isPending || rejectOrder.isPending}
                  >
                    {approveOrder.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      "Validate order"
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={approveOrder.isPending || rejectOrder.isPending}
                  >
                    {rejectOrder.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      "Reject order"
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Gateway payments do not require manual validation.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
