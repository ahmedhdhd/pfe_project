"use client";

import { LayoutTemplate } from "@/components/icons";
import { useGetPlaygroundById } from "@/hooks";

interface AiPlaygroundFrameProps {
  playgroundId?: string | null;
  title: string;
  className?: string;
  minHeightClassName?: string;
}

export function AiPlaygroundFrame({
  playgroundId,
  title,
  className,
  minHeightClassName = "min-h-[520px]",
}: AiPlaygroundFrameProps) {
  const playgroundQuery = useGetPlaygroundById(playgroundId ?? null, !!playgroundId);
  const containerClassName = `w-full overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm ${className ?? ""}`;
  const bodyClassName = `relative w-full ${minHeightClassName}`;

  if (!playgroundId) {
    return (
      <div className={containerClassName}>
        <div className={`flex items-center justify-center bg-muted/20 px-6 text-center text-sm text-muted-foreground ${minHeightClassName}`}>
          Playground is not linked yet.
        </div>
      </div>
    );
  }

  if (playgroundQuery.isLoading) {
    return (
      <div className={containerClassName}>
        <div className={`flex items-center justify-center bg-muted/20 px-6 text-center text-sm text-muted-foreground ${minHeightClassName}`}>
          Loading playground...
        </div>
      </div>
    );
  }

  if (!playgroundQuery.data?.html) {
    return (
      <div className={containerClassName}>
        <div className={`flex flex-col items-center justify-center gap-2 bg-muted/20 px-6 text-center text-sm text-muted-foreground ${minHeightClassName}`}>
          <LayoutTemplate className="h-8 w-8 opacity-40" />
          <p>Playground preview is unavailable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className={bodyClassName}>
        <iframe
          sandbox="allow-scripts allow-forms"
          srcDoc={playgroundQuery.data.html}
          className="absolute inset-0 h-full w-full border-0 bg-white"
          title={title}
        />
      </div>
    </div>
  );
}
