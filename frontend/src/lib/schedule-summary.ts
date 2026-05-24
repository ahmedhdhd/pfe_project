export function formatScheduleAiSummaryDisplay(raw?: string | null): {
  text: string;
  isError: boolean;
} {
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
  if (markerIndex >= 0) {
    return {
      text: raw.slice(markerIndex + marker.length).trim(),
      isError: false,
    };
  }

  return { text: raw.trim(), isError: false };
}
