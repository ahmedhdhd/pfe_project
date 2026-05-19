"use client";

import Link from "next/link";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TableActionsDropdownProps {
  id: string;
  viewHref?: string;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleStatus?: () => void;
  isActive?: boolean;
  isPublished?: boolean;
  isDeleting?: boolean;
  isUpdating?: boolean;
  showCopyId?: boolean;
  showView?: boolean;
  showEdit?: boolean;
  showToggleStatus?: boolean;
  showDelete?: boolean;
}

export function TableActionsDropdown({
  id,
  viewHref,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  isActive,
  isPublished,
  isDeleting = false,
  isUpdating = false,
  showCopyId = true,
  showView = true,
  showEdit = true,
  showToggleStatus = true,
  showDelete = true,
}: TableActionsDropdownProps) {
  const handleCopyId = () => {
    navigator.clipboard.writeText(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showCopyId && (
          <DropdownMenuItem onClick={handleCopyId}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
        )}
        {(showView || showEdit) && (
          <>
            <DropdownMenuSeparator />
            {showView && (
              <>
                {viewHref ? (
                  <DropdownMenuItem asChild>
                    <Link href={viewHref}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                ) : onView ? (
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                ) : null}
              </>
            )}
            {showEdit && (
              <DropdownMenuItem onClick={onEdit} disabled={isUpdating}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
          </>
        )}
        {showToggleStatus && onToggleStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onToggleStatus}
              disabled={isUpdating}
              className={
                isPublished !== undefined
                  ? isPublished
                    ? "text-orange-600"
                    : "text-green-600"
                  : isActive
                  ? "text-orange-600"
                  : "text-green-600"
              }
            >
              {isPublished !== undefined ? (
                isPublished ? (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Publish
                  </>
                )
              ) : isActive ? (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark as Inactive
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Active
                </>
              )}
            </DropdownMenuItem>
          </>
        )}
        {showDelete && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
