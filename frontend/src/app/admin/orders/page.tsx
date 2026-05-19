"use client";

import Link from "next/link";
import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminOrders } from "@/hooks";
import {
  formatPaymentProvider,
  formatCurrency,
  formatDate,
  getEntityLabel,
  getEntityName,
  getStatusBadgeVariant,
} from "@/app/[client]/student/orders/utils/order-utils";

export default function AdminOrdersPage() {
  const [page] = useState(1);
  const { data: response, isLoading } = useAdminOrders({ page, limit: 50 });
  const orders = response?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Review all student orders and validate manual payments."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Order table
          </CardTitle>
          <CardDescription>
            Monitor gateway payments and approve manual transfer proofs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No orders found yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isManual =
                      order.paymentProvider === "BANK_TRANSFER" ||
                      order.paymentProvider === "MANDAT_MINUTE_POSTE";
                    const actionLabel =
                      isManual &&
                      order.paymentStatus !== "SUCCESS" &&
                      order.manualReviewStatus !== "REJECTED"
                        ? "Review"
                        : "View";

                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-mono text-xs font-medium">
                              {order.receiptId || order.id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getEntityName(order.entityDetails) || "Order"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {order.user?.username || "Student"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.user?.email || "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getEntityLabel(order.entityType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatPaymentProvider(order.paymentProvider)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={getStatusBadgeVariant(order.paymentStatus)}>
                              {order.paymentStatus}
                            </Badge>
                            {order.manualReviewStatus ? (
                              <Badge variant="secondary">
                                {order.manualReviewStatus}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(order.amount, order.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/orders/${order.id}`}>
                              {actionLabel}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
