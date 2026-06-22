import { EntityType, PaymentStatus } from "@/lib/types/api";
import { format } from "date-fns";
import { formatCurrency as formatAmount } from "@/lib/utils/format";

export const PAYMENT_STATUS_OPTIONS: {
  value: PaymentStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All Status" },
  { value: "SUCCESS", label: "Success" },
  { value: "FAILED", label: "Failed" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "REFUNDED", label: "Refunded" },
];

export const getStatusBadgeVariant = (status: PaymentStatus) => {
  switch (status) {
    case "SUCCESS":
      return "default"; // Green/success color
    case "FAILED":
      return "destructive"; // Red/error color
    case "PENDING":
      return "secondary";
    case "PROCESSING":
      return "outline"; // Neutral for processing
    case "REFUNDED":
      return "secondary"; // Gray for refunded
    default:
      return "outline";
  }
};

export const formatCurrency = (amount: number, currency: string = "TND") =>
  formatAmount(amount, currency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  } catch {
    return dateString;
  }
};

export const getEntityName = (entityDetails?: Record<string, unknown>) => {
  if (!entityDetails || typeof entityDetails !== "object") return null;
  return (
    (entityDetails as { name?: string; title?: string }).name ||
    (entityDetails as { name?: string; title?: string }).title ||
    null
  );
};

export const getEntityLabel = (entityType: EntityType) => {
  switch (entityType) {
    case "BATCH":
      return "Course";
    case "BATCH_CART":
      return "Cart order";
    case "TEST_SERIES":
      return "Test Series";
    default:
      return "Order";
  }
};

export const formatPaymentProvider = (value?: string | null) => {
  switch (value) {
    case "BANK_TRANSFER":
      return "Virement bancaire";
    case "MANDAT_MINUTE_POSTE":
      return "Mandat minute poste";
    case "KONNECT":
      return "Konnect";
    default:
      return value || "—";
  }
};
