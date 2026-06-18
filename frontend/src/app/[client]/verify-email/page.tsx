"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, Loader2 } from "@/components/icons";
import { useStudentVerifyEmail } from "@/hooks/api";
import { useStudentAuthStore } from "@/lib/store/student-auth";
import { useEnhancedFormValidation, useLoadingState } from "@/hooks/common";
import { getFriendlyErrorMessage } from "@/lib/utils/error-handling";
import { ClientProvider, useClient } from "@/components/client/client-provider";
import Image from "next/image";

// Client Student Verify Email Component
function ClientStudentVerifyEmailContent() {
  const [isVerified, setIsVerified] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const hasProcessedToken = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { client } = useClient();

  // Student auth store
  const { setEmailVerified, setUserId } = useStudentAuthStore();

  // Student verification hooks
  const { mutateAsync: verifyEmail } = useStudentVerifyEmail();

  // Form validation (simplified for token handling)
  const { updateField } = useEnhancedFormValidation({
    verificationToken: "",
  });

  // Loading state management
  const { error, setError, executeWithLoading } = useLoadingState({
    autoReset: false,
  });

  const token = searchParams.get("token");

  useEffect(() => {
    if (token && !hasProcessedToken.current) {
      hasProcessedToken.current = true;
      setIsProcessingToken(true);
      updateField("verificationToken", token);

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
                router.push(`/login`);
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
    } else if (!token) {
      if (!hasProcessedToken.current) {
        hasProcessedToken.current = true;
        setError(
          "No verification token found. Please use the link from your email."
        );
        setIsProcessingToken(false);
      }
    }
  }, [
    token,
    updateField,
    executeWithLoading,
    verifyEmail,
    router,
    setError,
    setEmailVerified,
    setUserId,
  ]);

  // Success state - Email verified
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </motion.div>

          <h1 className="text-3xl font-bold text-foreground mb-3">
            Email Verified Successfully!
          </h1>
          <p className="text-muted-foreground mb-8">
            Your email has been verified. You can now sign in with your credentials.
          </p>

          <div className="flex items-center justify-center space-x-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirecting to login...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Processing/Error state - Verifying email
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md text-center"
      >
        {/* Logo/Branding */}
        <div className="mb-8">
          <div className="w-16 h-16 rounded-lg overflow-hidden mx-auto mb-4 shrink-0">
            <Image
              src={client?.logo || "/images/Logo.png"}
              alt={client?.name || "Organization"}
              width={128}
              height={128}
              quality={100}
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold mb-2">Email Verification</h1>
        </div>

        {/* Processing or Error State */}
        <div className="space-y-6">
          {isProcessingToken ? (
            <div className="p-6 bg-primary/10 dark:bg-primary/20 rounded-lg border border-primary/20 dark:border-primary/30">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Verifying Your Email
              </p>
              <p className="text-sm text-muted-foreground">
                Please wait while we verify your email address...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-red-900 dark:text-red-200 mb-2">
                Verification Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : (
            <div className="p-6 bg-muted/50 rounded-lg">
              <div className="animate-pulse rounded-full h-12 w-12 bg-muted-foreground/20 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">
                Waiting for verification...
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ClientStudentVerifyEmail() {
  const params = useParams();
  const clientSlug = params.client as string;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ClientProvider subdomain={clientSlug}>
        <ClientStudentVerifyEmailContent />
      </ClientProvider>
    </Suspense>
  );
}
