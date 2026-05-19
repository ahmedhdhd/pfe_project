"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Globe, GraduationCap, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BatchDetailHeaderProps {
  batch: {
    name: string;
    class?: "11" | "12" | "12+" | "Grad" | string;
    exam?: string;
    category?: {
      id: string;
      name: string;
    } | null;
    language: string;
    startDate: Date | string;
    endDate: Date | string;
  };
  activeTab: "description";
  onTabChange: (tab: "description") => void;
  onBack: () => void;
}

export function BatchDetailHeader({
  batch,
  activeTab,
  onTabChange,
  onBack,
}: BatchDetailHeaderProps) {
  const startDate = new Date(batch.startDate);
  const endDate = new Date(batch.endDate);

  return (
    <div className="border-b bg-card shadow-sm">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Top Section */}
        <div className="py-4 border-b border-border/40">
          <Button variant="ghost" onClick={onBack} className="mb-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Explore
          </Button>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {batch.category?.name && (
                  <Badge variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {batch.category.name}
                  </Badge>
                )}
                {batch.class && (
                  <Badge variant="secondary">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Class {batch.class}
                  </Badge>
                )}
                {batch.exam && <Badge variant="secondary">{batch.exam}</Badge>}
              </div>

              <h1 className="text-2xl font-bold mb-3">{batch.name}</h1>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {startDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    -{" "}
                    {endDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{batch.language}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-1 overflow-x-auto">
          <button
            onClick={() => onTabChange("description")}
            className={`relative py-4 px-2 text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === "description"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Description
            {activeTab === "description" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
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
