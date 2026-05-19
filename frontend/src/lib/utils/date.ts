/**
 * Format duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted string like "2h 30m" or "45m"
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Format date to relative time string
 * @param date - Date to format
 * @returns Formatted string like "2h ago", "Yesterday", or "Oct 28"
 */
export const formatDate = (date: Date): string => {
  const now = new Date();
  const diffInHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );

  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInHours < 48) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
};

/**
 * Format date range for display
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted string like "Jan 1 - Dec 31, 2025"
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const start = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = endDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} - ${end}`;
};
