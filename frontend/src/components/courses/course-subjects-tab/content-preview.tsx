"use client";

import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import { AiPlaygroundFrame } from "@/components/common/ai-playground-frame";
import { ContentType } from "@/components/common/content-form";
import { UnifiedVideoPlayer } from "@/components/common/unified-video-player";
import { Button } from "@/components/ui/button";
import { getVideoMimeType } from "@/components/student/course/utils";
import { buildExternalResourceDisplay } from "@/lib/utils/external-resource";
import { getContentName } from "./helpers";
import type { HierarchyContent } from "./types";

const PDFViewer = dynamic(
  () =>
    import("@/components/common/pdf-viewer").then((mod) => ({
      default: mod.PDFViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        Loading PDF preview...
      </div>
    ),
  }
);

export function ContentPreview({ content }: { content: HierarchyContent }) {
  if (content.type === "Lecture" && content.videoUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-black">
        <UnifiedVideoPlayer
          src={content.videoUrl}
          poster={content.videoThumbnail}
          type={getVideoMimeType(content.videoType, content.videoUrl)}
          className="w-full"
        />
      </div>
    );
  }

  if (content.type === "PDF" && content.pdfUrl) {
    return (
      <PDFViewer
        fileUrl={content.pdfUrl}
        title={getContentName(content)}
        height="640px"
      />
    );
  }

  if (content.type === ContentType.MARKDOWN && content.markdownBody) {
    return (
      <article className="max-h-[640px] overflow-y-auto rounded-2xl border bg-card p-6">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="mb-4 text-2xl font-bold">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="mb-3 mt-6 text-xl font-semibold">{children}</h2>
            ),
            p: ({ children }) => (
              <p className="mb-3 leading-7 text-muted-foreground">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 list-disc space-y-1 pl-6 text-muted-foreground">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 list-decimal space-y-1 pl-6 text-muted-foreground">
                {children}
              </ol>
            ),
          }}
        >
          {content.markdownBody}
        </ReactMarkdown>
      </article>
    );
  }

  if (content.type === ContentType.PLAYGROUND) {
    return (
      <AiPlaygroundFrame
        playgroundId={content.playgroundId}
        title={getContentName(content)}
        className="mx-auto max-w-5xl"
        minHeightClassName="min-h-[640px]"
      />
    );
  }

  const externalResource = buildExternalResourceDisplay(
    content.externalUrl,
    content.externalProvider
  );

  if (content.type === ContentType.URL && externalResource) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">
              {externalResource.providerLabel}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              {externalResource.normalizedUrl}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <a
              href={externalResource.normalizedUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          </Button>
        </div>
        {externalResource.embedUrl ? (
          <iframe
            src={externalResource.embedUrl}
            title={getContentName(content)}
            className="h-[600px] w-full border-0 bg-white"
            sandbox="allow-forms allow-popups allow-presentation allow-same-origin allow-scripts"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
            This resource cannot be embedded directly. Open it in a new tab.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      This content does not have a previewable asset yet.
    </div>
  );
}
