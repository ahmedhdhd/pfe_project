"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ExternalLink, FileText } from "lucide-react";
import type Player from "video.js/dist/types/player";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { UnifiedVideoPlayer } from "@/components/common/unified-video-player";
import type { Content } from "../utils/content-player-utils";
import { getVideoType } from "../utils/content-player-utils";
import { buildExternalResourceDisplay } from "@/lib/utils/external-resource";

const PDFViewer = dynamic(
  () =>
    import("@/components/common/pdf-viewer").then((mod) => ({
      default: mod.PDFViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center text-muted-foreground">
        Loading PDF viewer...
      </div>
    ),
  }
);

interface VideoPlayerWrapperProps {
  content: Content;
  playerInstance: Player | null;
  onPlayerReady: (player: Player) => void;
  onTimeUpdate: (currentTime: number) => void;
  onEnded: () => void;
  footer?: ReactNode;
}

export function VideoPlayerWrapper({
  content,
  playerInstance,
  onPlayerReady,
  onTimeUpdate,
  onEnded,
  footer,
}: VideoPlayerWrapperProps) {
  const isLecture = content.type === "Lecture" && content.videoUrl;
  const isPdf = content.type === "PDF" && content.pdfUrl;
  const isMarkdown = content.type === "MARKDOWN" && content.markdownBody;
  const externalResource = buildExternalResourceDisplay(
    content.externalUrl,
    content.externalProvider
  );
  const isExternalUrl = content.type === "URL" && externalResource;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-background">
      {isLecture && content.videoUrl ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative min-h-0 flex-1 overflow-hidden bg-black"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent"
            />

            <div className="relative z-10 h-full w-full">
              <UnifiedVideoPlayer
                src={content.videoUrl}
                poster={content.videoThumbnail}
                type={getVideoType(content.videoType, content.videoUrl)}
                className="h-full w-full"
                autoplay={false}
                onReady={(player) => {
                  onPlayerReady(player);
                }}
                onTimeUpdate={onTimeUpdate}
                onEnded={onEnded}
              />
            </div>
          </motion.div>

          {content.description?.trim() ? (
            <div className="border-t bg-background px-5 py-4">
              <div className="mx-auto w-full max-w-5xl">
                <h2 className="text-sm font-semibold text-foreground">
                  Lesson Description
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {content.description}
                </p>
              </div>
            </div>
          ) : null}
          {footer}
        </>
      ) : isPdf && content.pdfUrl ? (
        <div className="min-h-0 flex-1 bg-background">
          <PDFViewer
            fileUrl={content.pdfUrl}
            title={content.name}
            height="100%"
            className="h-full"
          />
          {content.description?.trim() ? (
            <div className="border-t px-5 py-4">
              <div className="mx-auto w-full max-w-5xl">
                <h2 className="text-sm font-semibold text-foreground">
                  Resource Description
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {content.description}
                </p>
              </div>
            </div>
          ) : null}
          {footer}
        </div>
      ) : isMarkdown ? (
        <div className="min-h-0 flex-1 overflow-y-auto bg-background">
          <article className="mx-auto max-w-4xl px-6 py-8">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="mb-5 text-3xl font-bold tracking-tight">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mb-4 mt-8 text-2xl font-semibold">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-3 mt-6 text-xl font-semibold">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mb-4 leading-7 text-muted-foreground">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc space-y-2 pl-6 text-muted-foreground">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 list-decimal space-y-2 pl-6 text-muted-foreground">
                    {children}
                  </ol>
                ),
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="mb-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-100">
                    {children}
                  </pre>
                ),
              }}
            >
              {content.markdownBody}
            </ReactMarkdown>
            {content.description?.trim() ? (
              <div className="mt-8 rounded-2xl border bg-muted/30 p-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Lesson Description
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {content.description}
                </p>
              </div>
            ) : null}
          </article>
          {footer}
        </div>
      ) : isExternalUrl && externalResource ? (
        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">
                {externalResource.providerLabel}
              </h2>
              <p className="mt-1 break-all text-xs text-muted-foreground">
                {externalResource.normalizedUrl}
              </p>
            </div>
            <Button asChild size="sm">
              <a
                href={externalResource.normalizedUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          {externalResource.embedUrl ? (
            <iframe
              src={externalResource.embedUrl}
              title={content.name}
              className="min-h-0 flex-1 border-0 bg-white"
              sandbox="allow-forms allow-popups allow-presentation allow-same-origin allow-scripts"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10 text-center">
              <div className="max-w-md space-y-2">
                <p className="text-sm font-medium text-foreground">
                  This resource cannot be embedded directly.
                </p>
                <p className="text-xs text-muted-foreground">
                  Use the Open button to view it in a new tab.
                </p>
              </div>
            </div>
          )}
          {content.description?.trim() ? (
            <div className="border-t px-5 py-4">
              <div className="mx-auto w-full max-w-5xl">
                <h2 className="text-sm font-semibold text-foreground">
                  Resource Description
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {content.description}
                </p>
              </div>
            </div>
          ) : null}
          {footer}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-black text-center text-white">
          <div>
            <FileText className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <p>Content not available</p>
          </div>
        </div>
      )}
    </div>
  );
}
