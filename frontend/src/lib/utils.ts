import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Decodes HTML entities in a string
 * Converts &lt; to <, &gt; to >, &amp; to &, etc.
 */
export function decodeHtmlEntities(html: string): string {
  if (!html) return "";

  // Use browser API if available (client-side)
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
  }

  // Fallback for server-side: manually decode common entities
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
