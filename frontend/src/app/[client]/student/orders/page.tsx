"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Receipt } from "@/components/icons";
import { useOrderHistory } from "@/hooks/api";
import { useIsMobile } from "@/hooks";
import { PAGINATION_DEFAULTS } from "@/lib/constants";
import { OrderFilters } from "./components/order-filters";
import { OrderTable } from "./components/order-table";
import { OrderCardMobile } from "./components/order-card-mobile";
import { OrderPagination } from "./components/order-pagination";

export default function OrdersPage() {
  const { isMobile, isClient } = useIsMobile();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const limit = PAGINATION_DEFAULTS.LIMIT;

  const { data: orderHistoryResponse, isLoading } = useOrderHistory({
    page,
    limit,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const orders = orderHistoryResponse?.data || [];
  const pagination = orderHistoryResponse?.pagination;

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset to first page when filter changes
  };

  const handlePreviousPage = () => {
    if (pagination?.hasPreviousPage) {
      setPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination?.hasNextPage) {
      setPage((prev) => prev + 1);
    }
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-linear-to-br from-background via-background to-muted/20">
      <StudentHeader />

      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6 space-y-6 md:space-y-8 max-w-7xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PageHeader
            title="Orders"
            description="Track your payments, upload manual payment proof, and follow admin validation."
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
            <Card className="border-border/60 shadow-lg">
            <CardHeader className="pb-4 border-b">
              <div className="mb-4 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                If you paid with <span className="font-medium text-foreground">virement bancaire</span> or <span className="font-medium text-foreground">mandat minute poste</span>, open the order and upload your justification image so the admin can validate it.
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Receipt className="h-5 w-5 text-primary" />
                    Orders
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {pagination
                      ? `Showing ${orders.length} of ${pagination.totalCount} orders`
                      : "Your order history"}
                  </CardDescription>
                </div>
                <OrderFilters
                  statusFilter={statusFilter}
                  onStatusFilterChange={handleStatusFilterChange}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No orders found
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {statusFilter !== "all"
                      ? "No orders match the selected filter"
                      : "You haven't placed any orders yet"}
                  </p>
                </div>
              ) : (
                <>
                  {isMobile ? (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <OrderCardMobile key={order.id} order={order} />
                      ))}
                    </div>
                  ) : (
                    <OrderTable orders={orders} />
                  )}

                  {pagination && (
                    <OrderPagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      hasNextPage={pagination.hasNextPage}
                      hasPreviousPage={pagination.hasPreviousPage}
                      onPrevious={handlePreviousPage}
                      onNext={handleNextPage}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
