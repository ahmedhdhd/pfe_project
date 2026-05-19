"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home, Bug } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    // Log error to external service in production (e.g., Sentry, LogRocket, etc.)
    // Example: logErrorToService(error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-linear-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <Card className="border-destructive/50 shadow-lg overflow-hidden">
              {/* Error Header */}
              <div className="bg-linear-to-r from-destructive/10 via-destructive/5 to-transparent p-6 border-b border-destructive/20">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4"
                >
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </motion.div>
                <h1 className="text-3xl font-bold text-center mb-2">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground text-center">
                  We encountered an unexpected error. Don&apos;t worry, your
                  data is safe.
                </p>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Error Details (Development Only) */}
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="p-4 rounded-lg bg-muted border border-destructive/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Bug className="h-4 w-4 text-destructive" />
                      <h3 className="font-semibold text-sm">Error Details</h3>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Error Message:
                        </p>
                        <p className="text-sm font-mono text-destructive wrap-break-word">
                          {this.state.error.message}
                        </p>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Stack Trace:
                          </p>
                          <pre className="text-xs font-mono bg-background p-3 rounded border overflow-auto max-h-40">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Component Stack:
                          </p>
                          <pre className="text-xs font-mono bg-background p-3 rounded border overflow-auto max-h-40">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* User-Friendly Message */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">
                        What happened?
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        An unexpected error occurred while rendering this page.
                        This could be due to a temporary issue or a bug in the
                        application.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900">
                    <RefreshCw className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">
                        What can you do?
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Try refreshing the page</li>
                        <li>Go back to the home page</li>
                        <li>Clear your browser cache and try again</li>
                        <li>Contact support if the problem persists</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={this.handleReset}
                    className="flex-1 gap-2"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                  <Button asChild variant="outline" className="flex-1 gap-2">
                    <Link href="/">
                      <Home className="h-4 w-4" />
                      Go Home
                    </Link>
                  </Button>
                </div>

                {/* Error ID for Support */}
                {this.state.error && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      Error ID: {this.state.error.name} -{" "}
                      {new Date().toISOString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary wrapper for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
}
