import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Order } from "@/lib/types/api";
import { OrderTableRow } from "./order-table-row";

interface OrderTableProps {
  orders: Order[];
}

export function OrderTable({ orders }: OrderTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="min-w-[200px] font-semibold">
              Order ID
            </TableHead>
            <TableHead className="min-w-[120px] font-semibold">Type</TableHead>
            <TableHead className="min-w-[140px] font-semibold text-right">
              Amount
            </TableHead>
            <TableHead className="min-w-[120px] font-semibold">
              Status
            </TableHead>
            <TableHead className="min-w-[140px] font-semibold">
              Payment Provider
            </TableHead>
            <TableHead className="min-w-[140px] font-semibold">
              Review
            </TableHead>
            <TableHead className="min-w-[180px] font-semibold">Date</TableHead>
            <TableHead className="min-w-[120px] font-semibold text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <OrderTableRow key={order.id} order={order} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
