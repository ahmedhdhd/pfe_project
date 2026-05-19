"use client";

import { motion } from "framer-motion";

interface MobileTestSeriesTabsProps {
  activeTab: "description" | "tests";
  onTabChange: (tab: "description" | "tests") => void;
  testCount?: number;
}

export function MobileTestSeriesTabs({
  activeTab,
  onTabChange,
  testCount = 0,
}: MobileTestSeriesTabsProps) {
  const tabs = [
    { id: "description" as const, label: "Description" },
    { id: "tests" as const, label: "Tests", count: testCount },
  ];

  return (
    <div className="sticky top-[calc(var(--mobile-hero-height,0px))] z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 h-12 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap px-2 ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-xs font-medium">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="mobileTestSeriesActiveTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

