"use client";

import { Loader2 } from "@/components/icons";
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-24 text-slate-400">
        Failed to load reports.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 mt-1">Review and resolve user reports</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400">Type</TableHead>
              <TableHead className="text-slate-400">Reason</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Date</TableHead>
              <TableHead className="text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reports ?? []).length === 0 ? (
              <TableRow className="border-slate-800">
                <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                  No reports found.
                </TableCell>
              </TableRow>
            ) : (
              (reports ?? []).map((report) => (
                <TableRow key={report.id} className="border-slate-800">
                  <TableCell className="text-slate-200">
                    {reportType(report)}
                  </TableCell>
                  <TableCell className="text-slate-300 max-w-xs truncate">
                    {report.reason}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(report.status)}>
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {report.status === "PENDING" && (
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
                          Dismiss
                        </Button>
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
