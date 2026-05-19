"use client";

import { motion } from "framer-motion";
import { ArrowLeft, FileText, Clock, Sparkles, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientTestSeriesListItem } from "@/hooks/test-series-client";

interface TestSeriesDetailHeaderProps {
  testSeries: ClientTestSeriesListItem;
  activeTab: "description" | "tests";
  onTabChange: (tab: "description" | "tests") => void;
  onBack: () => void;
  testCount: number;
  isEnrolled?: boolean;
}

export function TestSeriesDetailHeader({
  testSeries,
  activeTab,
  onTabChange,
  onBack,
  testCount,
  isEnrolled = false,
}: TestSeriesDetailHeaderProps) {
  const isHotDeal = (testSeries.discountPercentage || 0) >= 30;

  return (
    <div className="border-b bg-card">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="py-3 border-b border-border/40">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-2 -ml-2 hover:bg-accent h-8 text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Back to Test Series
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 font-medium text-xs"
                >
                  <Award className="h-3 w-3 mr-1" />
                  {testSeries.exam}
                </Badge>
                {testSeries.isFree && (
                  <Badge className="bg-emerald-500/90 text-white border-0 shadow-sm hover:bg-emerald-500 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Free
                  </Badge>
                )}
                {isHotDeal && (
                  <Badge className="bg-linear-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Hot Deal
                  </Badge>
                )}
                {testSeries.discountPercentage > 0 && !isEnrolled && (
                  <Badge className="bg-red-500/90 text-white border-0 shadow-sm text-xs">
                    {testSeries.discountPercentage}% OFF
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight text-foreground">
                {testSeries.title}
              </h1>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="p-1 rounded-md bg-primary/10 text-primary">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium">
                    <span className="text-foreground font-semibold">
                      {testCount}
                    </span>{" "}
                    {testCount === 1 ? "Test" : "Tests"}
                  </span>
                </div>
                {testSeries.durationDays > 0 && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="p-1 rounded-md bg-primary/10 text-primary">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium">
                      Valid for{" "}
                      <span className="text-foreground font-semibold">
                        {testSeries.durationDays}
                      </span>{" "}
                      {testSeries.durationDays === 1 ? "day" : "days"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate component for sticky tabs
export function TestSeriesStickyTabs({
  activeTab,
  onTabChange,
  testCount,
}: {
  activeTab: "description" | "tests";
  onTabChange: (tab: "description" | "tests") => void;
  testCount: number;
}) {
  return (
    <div className="bg-card border-b shadow-sm w-full backdrop-blur-sm">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1">
          <button
            onClick={() => onTabChange("description")}
            className={`relative py-3 px-3 text-sm font-semibold transition-all ${
              activeTab === "description"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Description
            {activeTab === "description" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => onTabChange("tests")}
            className={`relative py-3 px-3 text-sm font-semibold transition-all ${
              activeTab === "tests"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Tests
            {testCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-muted text-xs font-medium">
                {testCount}
              </span>
            )}
            {activeTab === "tests" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
