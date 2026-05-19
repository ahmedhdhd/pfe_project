"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Loader2, Receipt, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { StudentHeader } from "@/components/student/student-header";
import { FileUpload } from "@/components/common/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetOrderById, useUploadOrderProof } from "@/hooks";
import { useOrgCurrency } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";
import {
  formatPaymentProvider,
  formatDate,
  getEntityLabel,
  getStatusBadgeVariant,
} from "../utils/order-utils";

const MANUAL_PROVIDERS = ["BANK_TRANSFER", "MANDAT_MINUTE_POSTE"];

export default function StudentOrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const currency = useOrgCurrency();
  const { data: response, isLoading } = useGetOrderById(id);
  const uploadProof = useUploadOrderProof();

  const order = response?.data;

  const handleProofUpload = async (file: { url: string }) => {
    if (!order) return;

    try {
      toast.loading("Saving payment proof...");
      await uploadProof.mutateAsync({
        id: order.id,
        proofImageUrl: file.url,
      });
      toast.dismiss();
      toast.success("Proof uploaded successfully.");
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
              "Unable to upload proof.")
          : error instanceof Error
          ? error.message
          : "Unable to upload proof.";

      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-muted-foreground">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Loading order...
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="mx-auto max-w-6xl px-4 py-10">
          <Card>
            <CardContent className="space-y-4 p-8 text-center">
              <p className="text-lg font-semibold">Order not found</p>
              <Button asChild>
                <Link href="/student/orders">Back to orders</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const isManualPayment = MANUAL_PROVIDERS.includes(order.paymentProvider);
  const canUploadProof =
    isManualPayment &&
    order.paymentStatus !== "SUCCESS" &&
    order.manualReviewStatus !== "APPROVED";

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button variant="ghost" asChild className="px-0">
            <Link href="/student/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to orders
            </Link>
          </Button>
        </div>

        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Order detail</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              {order.receiptId || order.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created on {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusBadgeVariant(order.paymentStatus)}>
              {order.paymentStatus}
            </Badge>
            {order.manualReviewStatus ? (
              <Badge variant="outline">{order.manualReviewStatus}</Badge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Courses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length > 0 ? (
                  items.map((item) => (
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
                        {item.discountPercentage > 0 ? (
                          <p className="text-sm text-muted-foreground line-through">
                            {formatCurrency(item.originalPrice, currency)}
                          </p>
                        ) : null}
                        <p className="text-lg font-semibold text-primary">
                          {formatCurrency(item.finalPrice, currency)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No course snapshot is available for this order.
                  </p>
                )}
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
                <InfoLine label="Email" value={order.billingInfo?.email} className="md:col-span-2" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span>{getEntityLabel(order.entityType)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payment way</span>
                    <span>{formatPaymentProvider(order.paymentProvider)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(order.amount, order.currency || currency)}
                    </span>
                  </div>
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
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Payment proof
                </CardTitle>
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

                {canUploadProof ? (
                  <div className="space-y-3">
                    <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                      Upload the image that proves you sent the money. The admin
                      will review it before unlocking the course.
                    </div>
                    <FileUpload
                      accept="image/*"
                      maxSize={10}
                      folder="order-proofs"
                      endpoint="student"
                      onUploadComplete={handleProofUpload}
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                    {order.paymentStatus === "SUCCESS"
                      ? "This order is already validated."
                      : "Proof upload is not required for this order."}
                  </div>
                )}

                {uploadProof.isPending ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UploadCloud className="h-4 w-4 animate-pulse" />
                    Saving your proof...
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({
  label,
  value,
  className = "",
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
