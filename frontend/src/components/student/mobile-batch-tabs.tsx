"use client";

import { motion } from "framer-motion";

interface MobileBatchTabsProps {
  activeTab: "description";
  onTabChange: (tab: "description") => void;
}

export function MobileBatchTabs({
  activeTab,
  onTabChange,
}: MobileBatchTabsProps) {
  const tabs = [{ id: "description" as const, label: "Description" }];
  const visibleTabs = tabs;

  return (
    <div className="sticky top-[calc(var(--mobile-hero-height,0px))] z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
      <div className="flex overflow-x-auto scrollbar-hide">
        {visibleTabs.map((tab) => (
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
            {activeTab === tab.id && (
              <motion.div
                layoutId="mobileActiveTab"
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
