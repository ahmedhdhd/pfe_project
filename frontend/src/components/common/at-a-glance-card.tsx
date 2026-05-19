"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface AtAGlanceItem {
  icon: LucideIcon;
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface AtAGlanceCardProps {
  title?: string;
  items: AtAGlanceItem[];
  className?: string;
}

export function AtAGlanceCard({
  title = "At a Glance",
  items,
  className = "",
}: AtAGlanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20 shadow-md lg:hidden">
        <CardContent className="p-4">
          {title && (
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {title}
            </h3>
          )}
          <div className="grid grid-cols-2 gap-3">
            {items.map((item, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 ${
                  item.highlight ? "col-span-2" : ""
                }`}
              >
                <div
                  className={`p-1.5 rounded-md shrink-0 ${
                    item.highlight
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground leading-tight">
                    {item.label}
                  </div>
                  <div
                    className={`text-sm font-semibold leading-tight mt-0.5 ${
                      item.highlight ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

