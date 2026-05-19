import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAYMENT_STATUS_OPTIONS } from "../utils/order-utils";

interface OrderFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export function OrderFilters({
  statusFilter,
  onStatusFilterChange,
}: OrderFiltersProps) {
  return (
    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
