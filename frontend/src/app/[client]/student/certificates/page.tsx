"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { Award, Download, ExternalLink, Loader2, ShieldCheck } from "@/components/icons";
import { toast } from "sonner";
import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClaimBatchCertificate, useGetMyBatches } from "@/hooks";
import type {
  BatchCertificateIssuePayload,
  BatchCertificateStatusPayload,
} from "@/hooks/api";
import apiClient from "@/lib/api/client";
import { downloadBatchCertificatePdf } from "@/lib/certificates";

interface BatchRecord {
  id: string;
  name: string;
  imageUrl?: string;
  exam?: string;
  class?: string;
  language?: string;
}

const extractStatusPayload = (
  payload: unknown
): BatchCertificateStatusPayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as {
    data?: BatchCertificateStatusPayload;
  };

  return record.data || null;
};

const extractIssuedCertificate = (
  payload: unknown
): BatchCertificateIssuePayload | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as {
    data?: {
      certificate?: BatchCertificateIssuePayload | null;
    };
  };

  return record.data?.certificate || null;
};

export default function StudentCertificatesPage() {
  const { data: batchesResponse, isLoading: isLoadingBatches } = useGetMyBatches(
    1,
    50
  );
  const claimCertificate = useClaimBatchCertificate();
  const [busyBatchIds, setBusyBatchIds] = useState<Set<string>>(new Set());

  const batches: BatchRecord[] = Array.isArray(batchesResponse?.data)
    ? (batchesResponse.data as BatchRecord[])
    : [];

  const certificateQueries = useQueries({
    queries: batches.map((batch) => ({
      queryKey: ["studentCertificates", batch.id],
      queryFn: () =>
        apiClient.get(`/api/batches/${batch.id}/certificate`).then((res) => res.data),
      enabled: !!batch.id,
      staleTime: 60 * 1000,
    })),
  });

  const isLoadingStatuses = certificateQueries.some(
    (query) => query.isLoading
  );

  const certificateCards = useMemo(
    () =>
      batches.map((batch, index) => ({
        batch,
        status: extractStatusPayload(certificateQueries[index]?.data),
        isLoading: certificateQueries[index]?.isLoading ?? false,
      })),
    [batches, certificateQueries]
  );

  const completedCertificateCards = useMemo(() => {
    return certificateCards.filter(({ status, isLoading }) => {
      if (isLoading) return false;

      const progress = Math.round(status?.progress?.progressPercentage || 0);
      const completedVideos = status?.progress?.completedVideos || 0;
      const totalVideos = status?.progress?.totalVideos || 0;

      // Consider the course complete if:
      // - progress is 100%, or
      // - backend flags completion, or
      // - all videos are completed (when totals exist).
      return Boolean(
        status?.isCompleted ||
          progress >= 100 ||
          (totalVideos > 0 && completedVideos >= totalVideos)
      );
    });
  }, [certificateCards]);

  const handleDownload = async (
    batchId: string,
    status: BatchCertificateStatusPayload | null
  ) => {
    try {
      setBusyBatchIds((current) => {
        const next = new Set(current);
        next.add(batchId);
        return next;
      });

      let certificate = status?.certificate || null;

      if (!certificate) {
        const claimResponse = await claimCertificate.mutateAsync(batchId);
        certificate = extractIssuedCertificate(claimResponse);
      }

      if (!certificate) {
        throw new Error("Certificate is not ready yet.");
      }

      await downloadBatchCertificatePdf({ certificate });
      toast.success("Certificate downloaded.");
    } catch (error) {
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
            : "Unable to download the certificate.";
      toast.error(message);
    } finally {
      setBusyBatchIds((current) => {
        const next = new Set(current);
        next.delete(batchId);
        return next;
      });
    }
  };

  const handleShare = async (
    batchId: string,
    status: BatchCertificateStatusPayload | null
  ) => {
    try {
      setBusyBatchIds((current) => {
        const next = new Set(current);
        next.add(batchId);
        return next;
      });

      let certificate = status?.certificate || null;

      if (!certificate) {
        const claimResponse = await claimCertificate.mutateAsync(batchId);
        certificate = extractIssuedCertificate(claimResponse);
      }

      if (!certificate) {
        throw new Error("Certificate is not ready yet.");
      }

      const verificationUrl = `${window.location.origin}/certificates/${certificate.credentialId}`;
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          verificationUrl
        )}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
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
    } finally {
      setBusyBatchIds((current) => {
        const next = new Set(current);
        next.delete(batchId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <StudentHeader />

      <div className="container mx-auto max-w-7xl space-y-8 px-4 py-6">
        <PageHeader
          title="Certificates"
          description="Certificates appear here after you finish a course."
        />

        {isLoadingBatches || isLoadingStatuses ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : completedCertificateCards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
              <Award className="h-12 w-12 text-muted-foreground/40" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">No certificates yet</h2>
                <p className="text-sm text-muted-foreground">
                  Finish a course to 100% to unlock its certificate.
                </p>
              </div>
              <Button asChild>
                <Link href="/student/explore">Explore Courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {completedCertificateCards.map(({ batch, status, isLoading }) => {
              const progress = Math.round(status?.progress?.progressPercentage || 0);
              const isEffectivelyCompleted = Boolean(
                status?.isCompleted ||
                  status?.certificate ||
                  (status?.configured &&
                    ((status?.progress?.completedVideos || 0) > 0) &&
                    (status?.progress?.completedVideos || 0) >=
                      (status?.progress?.totalVideos || 0)) ||
                  (status?.configured && progress >= 100)
              );
              const canDownload = Boolean(
                status?.certificate || status?.eligible || isEffectivelyCompleted
              );
              const isBusy = busyBatchIds.has(batch.id);

              return (
                <Card key={batch.id} className="overflow-hidden border-border/70 shadow-sm">
                  <div className="relative h-40 bg-linear-to-br from-primary/15 via-background to-accent/15">
                    {batch.imageUrl ? (
                      <img
                        src={batch.imageUrl}
                        alt={batch.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Award className="h-12 w-12 text-primary/35" />
                      </div>
                    )}
                  </div>

                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="line-clamp-2 text-lg">
                        {batch.name}
                      </CardTitle>
                      {status?.certificate ? (
                        <Badge className="bg-emerald-600 text-white">
                          Issued
                        </Badge>
                      ) : canDownload ? (
                        <Badge variant="secondary">Ready</Badge>
                      ) : (
                        <Badge variant="outline">Locked</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {batch.exam ? <span>{batch.exam}</span> : null}
                      {batch.class ? <span>Class {batch.class}</span> : null}
                      {batch.language ? <span>{batch.language}</span> : null}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading certificate status...
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
                          {status?.certificate ? (
                            <div className="flex items-center gap-2 text-foreground">
                              <ShieldCheck className="h-4 w-4 text-emerald-600" />
                              Certificate already issued
                            </div>
                          ) : canDownload ? (
                            "This certificate is ready to generate."
                          ) : status?.configured ? (
                            "Finish the course to unlock the certificate."
                          ) : (
                            "This course does not have a certificate configured yet."
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => handleDownload(batch.id, status)}
                            disabled={!canDownload || isBusy}
                            className="flex-1"
                          >
                            {isBusy ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Preparing...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleShare(batch.id, status)}
                            disabled={!canDownload || isBusy}
                            title="Share on LinkedIn"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
