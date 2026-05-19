"use client";

import { useMemo } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { cn } from "@/lib/utils";

interface PDFViewerProps {
  /** PDF file URL */
  fileUrl: string;
  /** Optional title for the PDF */
  title?: string;
  /** Additional CSS classes */
  className?: string;
  /** Height of the viewer */
  height?: string;
}

/**
 * PDF Viewer Component
 *
 * A feature-rich PDF viewer with:
 * - Zoom controls (zoom in, zoom out, fit to page, actual size)
 * - Navigation (previous/next page, go to page)
 * - Download and print options
 * - Fullscreen mode
 * - Text selection
 * - Search functionality
 *
 * @example
 * ```tsx
 * <PDFViewer
 *   fileUrl="https://example.com/document.pdf"
 *   title="Course Material"
 *   height="600px"
 * />
 * ```
 */
export function PDFViewer({
  fileUrl,
  title,
  className,
  height = "100%",
}: PDFViewerProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Thumbnail tab
      defaultTabs[1], // Bookmark tab
    ],
  });

  // Proxy PDF through API route to avoid CORS issues
  const proxiedUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return fileUrl;
    }

    try {
      const urlObj = new URL(fileUrl);
      const currentOrigin = window.location.origin;

      // If same origin, use directly; otherwise proxy through API
      if (urlObj.origin === currentOrigin) {
        return fileUrl;
      }

      // Use proxy for external URLs (CloudFront, CDN, etc.)
      return `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`;
    } catch {
      // If URL parsing fails, try to proxy it
      return `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`;
    }
  }, [fileUrl]);

  return (
    <div
      className={cn("w-full rounded-lg border bg-background", className)}
      style={{ height }}
    >
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <div style={{ height: "100%", width: "100%" }} title={title}>
          <Viewer
            fileUrl={proxiedUrl}
            plugins={[defaultLayoutPluginInstance]}
            httpHeaders={{
              Accept: "application/pdf,application/octet-stream,*/*",
            }}
          />
        </div>
      </Worker>
    </div>
  );
}
