import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/lib/types/api";
import {
  formatPaymentProvider,
  formatCurrency,
  formatDate,
  getEntityLabel,
  getStatusBadgeVariant,
  getEntityName,
} from "../utils/order-utils";

interface OrderTableRowProps {
  order: Order;
}

export function OrderTableRow({ order }: OrderTableRowProps) {
  const entityName = getEntityName(order.entityDetails);
  const isManual =
    order.paymentProvider === "BANK_TRANSFER" ||
    order.paymentProvider === "MANDAT_MINUTE_POSTE";
  const actionLabel =
    isManual && order.paymentStatus !== "SUCCESS"
      ? order.proofImageUrl
        ? "Review proof"
        : "Upload proof"
      : "View";

  return (
    <TableRow key={order.id} className="hover:bg-muted/20 transition-colors">
      <TableCell className="py-4">
        <div className="space-y-1.5">
          <div className="font-mono text-xs font-medium">
            {order.receiptId || order.id.slice(0, 8)}
          </div>
          {entityName && (
            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
              {entityName}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4">
        <Badge variant="outline" className="font-medium">
          {getEntityLabel(order.entityType)}
        </Badge>
      </TableCell>
      <TableCell className="py-4 font-semibold text-right">
        {formatCurrency(order.amount, order.currency)}
      </TableCell>
      <TableCell className="py-4">
        <Badge
          variant={getStatusBadgeVariant(order.paymentStatus)}
          className="font-medium"
        >
          {order.paymentStatus}
        </Badge>
      </TableCell>
      <TableCell className="py-4 text-muted-foreground capitalize">
        {formatPaymentProvider(order.paymentProvider)}
      </TableCell>
      <TableCell className="py-4">
        {order.manualReviewStatus ? (
          <Badge variant="secondary" className="font-medium">
            {order.manualReviewStatus}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="py-4 text-muted-foreground text-sm">
        {formatDate(order.createdAt)}
      </TableCell>
      <TableCell className="py-4 text-right">
        <Button asChild variant="outline" size="sm">
          <Link href={`/student/orders/${order.id}`}>{actionLabel}</Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
