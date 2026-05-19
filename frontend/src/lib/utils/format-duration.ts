/**
 * Utility function to format duration from seconds to MM:SS format
 * 
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "5:30") or empty string if invalid
 * 
 * @example
 * ```ts
 * formatDuration(90) // "1:30"
 * formatDuration(3665) // "61:05"
 * ```
 */
export function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

