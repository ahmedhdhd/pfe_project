"use client";

import { useEffect } from "react";

interface PreviewPatch {
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
}

// Mount this component inside the [client] layout.
// It listens for postMessage from the admin page editor and patches the DOM directly
// for instant preview without a server round-trip.
export function PreviewListener() {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "TESLA_PREVIEW_PATCH") return;
      const patch: PreviewPatch = e.data.payload || {};

      // Text patches — target elements by data-preview attribute
      if (patch.heroTitle !== undefined) {
        document
          .querySelectorAll("[data-preview='hero-title']")
          .forEach((el) => {
            el.textContent = patch.heroTitle!;
          });
      }
      if (patch.heroSubtitle !== undefined) {
        document
          .querySelectorAll("[data-preview='hero-subtitle']")
          .forEach((el) => {
            el.textContent = patch.heroSubtitle!;
          });
      }
      if (patch.ctaText !== undefined) {
        document
          .querySelectorAll("[data-preview='cta-text']")
          .forEach((el) => {
            el.textContent = patch.ctaText!;
          });
      }

      // Color patches — update CSS variables directly
      const root = document.documentElement;
      if (patch.primaryColor) {
        root.style.setProperty("--preview-primary", patch.primaryColor);
        root.style.setProperty("--primary", hexToApproxOklch(patch.primaryColor));
      }
      if (patch.secondaryColor) {
        root.style.setProperty("--preview-secondary", patch.secondaryColor);
        root.style.setProperty("--secondary", hexToApproxOklch(patch.secondaryColor));
        root.style.setProperty("--accent", hexToApproxOklch(patch.secondaryColor));
      }
      if (patch.fontFamily) {
        root.style.setProperty("--font-sans", patch.fontFamily);
        document.body.style.fontFamily = patch.fontFamily;
      }
    };

    window.addEventListener("message", handler);
    // Signal to the parent editor that we are ready
    window.parent.postMessage({ type: "TESLA_PREVIEW_READY" }, "*");

    return () => window.removeEventListener("message", handler);
  }, []);

  return null;
}

// Minimal hex → approximate oklch conversion for preview (not production-accurate)
// The full converter in lib/utils/color-converter.ts is used in production
function hexToApproxOklch(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const l = Math.cbrt(0.4122 * r + 0.5363 * g + 0.0514 * b);
    const m = Math.cbrt(0.2119 * r + 0.6807 * g + 0.1073 * b);
    const s = Math.cbrt(0.0883 * r + 0.2817 * g + 0.6299 * b);
    const L = 0.2104 * l + 0.7936 * m - 0.0040 * s;
    const a = 1.9779 * l - 2.4285 * m + 0.4505 * s;
    const bVal = 0.0259 * l + 0.7827 * m - 0.8086 * s;
    const C = Math.sqrt(a * a + bVal * bVal);
    const H = ((Math.atan2(bVal, a) * 180) / Math.PI + 360) % 360;
    return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
  } catch {
    return hex;
  }
}
