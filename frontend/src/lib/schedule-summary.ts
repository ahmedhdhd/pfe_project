export function formatScheduleAiSummaryDisplay(
  raw?: string | null,
  options?: {
    summaryStatus?: string | null;
    summaryError?: string | null;
  }
): {
  text: string;
  isError: boolean;
} {
  if (options?.summaryStatus === "FAILED") {
    return {
      text: options.summaryError?.trim() || "Summary generation failed.",
      isError: true,
    };
  }

  if (!raw?.trim()) {
    return { text: "", isError: false };
  }

  if (raw.startsWith("=== SUMMARY GENERATION ERROR ===")) {
    return {
      text: raw.replace("=== SUMMARY GENERATION ERROR ===", "").trim(),
      isError: true,
    };
  }

  const marker = "=== AI SUMMARY ===";
  const markerIndex = raw.indexOf(marker);
  const text = (markerIndex >= 0 ? raw.slice(markerIndex + marker.length) : raw)
    .trim()
    .replace(/^```(?:markdown)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return { text, isError: false };
}
