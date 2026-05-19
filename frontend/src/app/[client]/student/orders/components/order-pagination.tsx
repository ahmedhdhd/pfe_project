import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrderPaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function OrderPagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPrevious,
  onNext,
}: OrderPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/40">
      <div className="text-sm text-muted-foreground font-medium">
        Page <span className="text-foreground">{currentPage}</span> of{" "}
        <span className="text-foreground">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
          className="font-medium"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasNextPage}
          className="font-medium"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
