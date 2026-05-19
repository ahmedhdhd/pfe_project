"use client";

import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  error: string | null;
  onDismiss?: () => void;
  className?: string;
  variant?: "default" | "destructive" | "warning";
}

export function ErrorMessage({
  error,
  onDismiss,
  className,
  variant = "destructive",
}: ErrorMessageProps) {
  if (!error) return null;

  const variantStyles = {
    default: "bg-muted border-muted-foreground/20 text-muted-foreground",
    destructive: "bg-destructive/10 border-destructive/20 text-destructive",
    warning:
      "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/10 dark:border-yellow-800/20 dark:text-yellow-400",
  };

  return (
    <div
      className={cn(
        "border rounded-lg p-3 flex items-start space-x-2",
        variantStyles[variant],
        className
      )}
    >
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface SuccessMessageProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
}

export function SuccessMessage({
  message,
  onDismiss,
  className,
}: SuccessMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 flex items-start space-x-2",
        "dark:bg-green-900/10 dark:border-green-800/20 dark:text-green-400",
        className
      )}
    >
      <div className="h-4 w-4 mt-0.5 shrink-0 rounded-full bg-green-500 flex items-center justify-center">
        <div className="h-2 w-2 bg-white rounded-full" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Success</p>
        <p className="text-sm">{message}</p>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

interface LoadingMessageProps {
  message: string;
  className?: string;
}

export function LoadingMessage({ message, className }: LoadingMessageProps) {
  return (
    <div
      className={cn(
        "bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 flex items-center space-x-2",
        "dark:bg-blue-900/10 dark:border-blue-800/20 dark:text-blue-400",
        className
      )}
    >
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
