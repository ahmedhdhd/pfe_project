"use client";

import { FileText, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { PremiumTabsTrigger } from "./premium-tabs-trigger";
import { ReactNode } from "react";

export interface ContentFilterTabsProps {
  /** Total count of all content */
  totalCount: number;
  /** Count of lectures */
  lecturesCount: number;
  /** Count of PDFs */
  pdfsCount: number;
  /** Content to display in "All" tab */
  allContent: ReactNode;
  /** Content to display in "Lectures" tab */
  lecturesContent: ReactNode;
  /** Content to display in "PDFs" tab */
  pdfsContent: ReactNode;
  /** Optional label above tabs */
  label?: string;
  /** Default tab value */
  defaultValue?: string;
  /** Optional className */
  className?: string;
}

/**
 * Reusable content filter tabs component
 *
 * Displays tabs for filtering content by type (All, Lectures, PDFs)
 * with animated underline indicators and count badges
 *
 * @example
 * ```tsx
 * <ContentFilterTabs
 *   totalCount={10}
 *   lecturesCount={7}
 *   pdfsCount={3}
 *   allContent={<ContentGrid contents={allContents} />}
 *   lecturesContent={<ContentGrid contents={lectures} />}
 *   pdfsContent={<ContentGrid contents={pdfs} />}
 * />
 * ```
 */
export function ContentFilterTabs({
  totalCount,
  lecturesCount,
  pdfsCount,
  allContent,
  lecturesContent,
  pdfsContent,
  label = "Filter by type",
  defaultValue = "all",
  className,
}: ContentFilterTabsProps) {
  const isFlexLayout = className?.includes("flex");

  return (
    <div className={className}>
      <Tabs
        defaultValue={defaultValue}
        className={
          isFlexLayout
            ? "w-full flex-1 flex flex-col overflow-hidden"
            : "w-full"
        }
      >
        {label && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              {label}
            </h3>
          </div>
        )}
        <TabsList className="flex h-11 items-center justify-start gap-2 rounded-lg bg-transparent p-0 w-full border-b border-border/60 shrink-0">
          <PremiumTabsTrigger value="all" icon={FileText} count={totalCount}>
            All
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="lectures" icon={Video} count={lecturesCount}>
            Lectures
          </PremiumTabsTrigger>
          <PremiumTabsTrigger value="pdfs" icon={FileText} count={pdfsCount}>
            PDFs
          </PremiumTabsTrigger>
        </TabsList>

        <TabsContent
          value="all"
          className={isFlexLayout ? "mt-4 flex-1 overflow-y-auto" : "mt-6"}
        >
          {allContent}
        </TabsContent>

        <TabsContent
          value="lectures"
          className={isFlexLayout ? "mt-4 flex-1 overflow-y-auto" : "mt-6"}
        >
          {lecturesContent}
        </TabsContent>

        <TabsContent
          value="pdfs"
          className={isFlexLayout ? "mt-4 flex-1 overflow-y-auto" : "mt-6"}
        >
          {pdfsContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
