"use client";

import { useMemo, useState } from "react";
import {
  Award,
  Download,
  Loader2,
  Lock,
  Share2,
  ShieldCheck,
} from "@/components/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useClaimBatchCertificate,
  useGetBatchCertificateStatus,
} from "@/hooks";
import type { BatchCertificateIssuePayload } from "@/hooks/api";
import { downloadBatchCertificatePdf } from "@/lib/certificates";

interface CourseCertificateSectionProps {
  batchId: string;
  isPurchased?: boolean;
}

const getCertificateFromPayload = (
  payload: unknown
): BatchCertificateIssuePayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeWrapped = payload as {
    data?: {
      certificate?: BatchCertificateIssuePayload | null;
    };
    certificate?: BatchCertificateIssuePayload | null;
  };

  if (maybeWrapped.data?.certificate) {
    return maybeWrapped.data.certificate;
  }

  return maybeWrapped.certificate || null;
};

export function CourseCertificateSection({
  batchId,
  isPurchased,
}: CourseCertificateSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { data, isLoading } = useGetBatchCertificateStatus(
    batchId,
    Boolean(isPurchased)
  );
  const claimCertificate = useClaimBatchCertificate();

  const status = useMemo(() => {
    if (!data || typeof data !== "object" || !("data" in data)) {
      return null;
    }

    const wrapped = data as {
      data?: {
        configured?: boolean;
        eligible?: boolean;
        isCompleted?: boolean;
        progress?: {
          progressPercentage?: number;
          completedVideos?: number;
          totalVideos?: number;
        };
        certificate?: BatchCertificateIssuePayload | null;
      };
    };

    return wrapped.data || null;
  }, [data]);

  if (!isPurchased) {
    return null;
  }

  const ensureCertificate = async () => {
    const existingCertificate = status?.certificate;
    if (existingCertificate) {
      return existingCertificate;
    }

    const result = await claimCertificate.mutateAsync(batchId);
    return getCertificateFromPayload(result);
  };

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const certificate = await ensureCertificate();

      if (!certificate) {
        throw new Error("Certificate information is unavailable.");
      }

      const verificationUrl = `${window.location.origin}/certificates/${certificate.credentialId}`;
      await downloadBatchCertificatePdf({
        certificate,
        verificationUrl,
      });
      toast.success("Certificate downloaded.");
    } catch (error) {
      console.error("Certificate download failed:", error);
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Unable to generate the certificate.";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      const certificate = await ensureCertificate();

      if (!certificate) {
        throw new Error("Certificate information is unavailable.");
      }

      const verificationUrl = `${window.location.origin}/certificates/${certificate.credentialId}`;
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        verificationUrl
      )}`;

      window.open(linkedInUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Certificate share failed:", error);
      const message =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object" &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : "Unable to open LinkedIn sharing.";
      toast.error(message);
    }
  };

  const progressPercentage = Math.round(
    status?.progress?.progressPercentage || 0
  );
  const completedVideos = status?.progress?.completedVideos || 0;
  const totalVideos = status?.progress?.totalVideos || 0;
  const isReady = Boolean(
    status?.eligible ||
      status?.certificate ||
      status?.isCompleted ||
      (Boolean(status?.configured) &&
        completedVideos > 0 &&
        completedVideos >= totalVideos) ||
      (Boolean(status?.configured) && progressPercentage >= 100)
  );
  const isConfigured = Boolean(status?.configured);
  const hasCertificate = Boolean(status?.certificate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Course Certificate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading certificate status...
          </div>
        ) : !isConfigured ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
            This course does not have a certificate configured yet.
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {hasCertificate
                      ? "Your certificate is ready"
                      : isReady
                      ? "Certificate unlocked"
                      : "Complete the course to unlock the certificate"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {completedVideos} of {totalVideos} lessons completed
                  </p>
                </div>
                {isReady ? (
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Progress: {progressPercentage}%
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleDownload}
                disabled={!isReady || isGenerating || claimCertificate.isPending}
              >
                {isGenerating || claimCertificate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {hasCertificate
                      ? "Download Certificate"
                      : "Generate Certificate"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={!isReady || isGenerating || claimCertificate.isPending}
              >
                <Share2 className="h-4 w-4" />
                Share on LinkedIn
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
