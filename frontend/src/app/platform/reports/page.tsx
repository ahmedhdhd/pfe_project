"use client";

import { useMemo } from "react";
import { Loader2, FileWarning, CheckCircle2, Clock3, XCircle } from "@/components/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatformReports, useResolveReport } from "@/hooks/platform";

const statusVariant = (status: string) => {
  switch (status) {
    case "RESOLVED":
      return "default";
    case "DISMISSED":
      return "secondary";
    default:
      return "outline";
  }
};

const reportType = (report: {
  batchId: string | null;
  contentId: string | null;
}) => {
  if (report.contentId) return "Content";
  if (report.batchId) return "Batch";
  return "General";
};

export default function PlatformReportsPage() {
  const { data: reports, isLoading, error } = usePlatformReports();
  const resolveReport = useResolveReport();

  const summary = useMemo(() => {
    const items = reports ?? [];

    return {
      pending: items.filter((report) => report.status === "PENDING").length,
      resolved: items.filter((report) => report.status === "RESOLVED").length,
      dismissed: items.filter((report) => report.status === "DISMISSED").length,
    };
  }, [reports]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-16 text-center text-red-100">
        Failed to load reports.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.10),transparent_35%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#f1f5f9_100%)] p-6 md:p-8 shadow-sm">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
            <FileWarning className="h-3.5 w-3.5" />
            Moderation center
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Reports
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Review, resolve, or dismiss user reports from a cleaner moderation workspace.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.pending}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resolved</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.resolved}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dismissed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.dismissed}</p>
          </div>
        </div>
      </section>

      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-transparent">
              <TableHead className="text-slate-400">Type</TableHead>
              <TableHead className="text-slate-400">Reason</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Date</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reports ?? []).length === 0 ? (
              <TableRow className="border-slate-200">
                <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                  No reports found.
                </TableCell>
              </TableRow>
            ) : (
              (reports ?? []).map((report) => (
                <TableRow key={report.id} className="border-slate-200">
                  <TableCell className="text-slate-700">{reportType(report)}</TableCell>
                  <TableCell className="max-w-xs truncate text-slate-600">
                    {report.reason}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(report.status)}>{report.status}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.status === "PENDING" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={resolveReport.isPending}
                          onClick={() =>
                            resolveReport.mutate({
                              id: report.id,
                              status: "RESOLVED",
                            })
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Resolve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={resolveReport.isPending}
                          onClick={() =>
                            resolveReport.mutate({
                              id: report.id,
                              status: "DISMISSED",
                            })
                          }
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Dismiss
                        </Button>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <Clock3 className="h-4 w-4" />
                        Handled
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
