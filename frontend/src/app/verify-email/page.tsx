"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { useVerifyEmail } from "@/hooks";
import { useOnboardingStore } from "@/lib/store/onboarding";
import { useLoadingState } from "@/hooks/common";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";
import { ErrorMessage } from "@/components/common/error-message";

function VerifyEmailContent() {
  const [isVerified, setIsVerified] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const hasProcessedToken = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setEmailVerified, setUserId } = useOnboardingStore();
  const { mutateAsync: verifyEmail } = useVerifyEmail();

  // Loading state management
  const { error, setError, executeWithLoading } = useLoadingState({
    autoReset: true,
  });

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      if (!hasProcessedToken.current) {
        hasProcessedToken.current = true;
        setError("No verification token found. Please check your email link.");
      }
      return;
    }

    if (!hasProcessedToken.current) {
      hasProcessedToken.current = true;
      setIsProcessingToken(true);

      const processToken = async () => {
        try {
          await executeWithLoading(async () => {
            const result = (await verifyEmail({
              token,
            })) as {
              success: boolean;
              data?: { userId: string; message: string };
            };

            if (result.success && result.data?.userId) {
              setIsVerified(true);
              setEmailVerified(true);
              setUserId(result.data.userId);

              setTimeout(() => {
                router.push("/set-password");
              }, 2000);
              return;
            }

            setError(
              "Invalid verification code. Please check the link or try again."
            );
          });
        } catch (error: unknown) {
          setError(getFriendlyErrorMessage(error));
        } finally {
          setIsProcessingToken(false);
        }
      };

      void processToken();
    }
  }, [
    token,
    executeWithLoading,
    verifyEmail,
    router,
    setEmailVerified,
    setUserId,
    setError,
  ]);

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto p-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="h-8 w-8 text-primary-foreground" />
          </motion.div>

          <h1 className="text-2xl font-bold text-primary mb-2">
            Email Verified Successfully!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your email has been verified. You&apos;ll be redirected to set your
            password shortly.
          </p>

          <div className="flex items-center justify-center space-x-2 text-sm text-primary">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Redirecting to password setup...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center"
      >
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Verifying Your Email</h2>
          <p className="text-muted-foreground">
            Processing your verification link...
          </p>
        </div>

        {/* Processing State */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              {isProcessingToken ? (
                <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20 dark:border-primary/30">
                  <div className="flex items-center justify-center space-x-2 text-primary">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium">
                      Verifying your email...
                    </span>
                  </div>
                </div>
              ) : error ? (
                <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <ErrorMessage error={error} />
                </div>
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                    <div className="animate-pulse rounded-full h-6 w-6 bg-muted-foreground/20"></div>
                    <span className="text-sm">Waiting for verification...</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
