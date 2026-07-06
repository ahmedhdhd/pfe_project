"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ALL_CATEGORY_ICONS,
  getCategoryIcon,
  getCategoryIconLabel,
} from "@/lib/categories";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function IconPicker({ value, onChange, id }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const CurrentIcon = getCategoryIcon(value);

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return ALL_CATEGORY_ICONS;
    return ALL_CATEGORY_ICONS.filter((icon) =>
      icon.value.toLowerCase().includes(q)
    );
  }, [query]);

  const handleSelect = (iconValue: string) => {
    onChange(iconValue);
    setOpen(false);
  };

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => {
          setQuery("");
          setOpen(true);
        }}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-center gap-2">
          <CurrentIcon className="h-4 w-4 shrink-0" />
          <span className="truncate">{getCategoryIconLabel(value)}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose an icon</DialogTitle>
            <DialogDescription>
              Search across all {ALL_CATEGORY_ICONS.length} icons available in
              the icon library.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search icons — e.g. book, chart, globe..."
              className="pl-9"
            />
          </div>

          {filteredIcons.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-1 text-center">
              <p className="text-sm font-medium">No icons found</p>
              <p className="text-xs text-muted-foreground">
                No icon matches &quot;{query}&quot;. Try a different word.
              </p>
            </div>
          ) : (
            <div className="grid max-h-[420px] grid-cols-4 gap-1 overflow-y-auto pr-1 sm:grid-cols-6">
              {filteredIcons.map((icon) => {
                const isSelected = icon.value === value;
                return (
                  <button
                    key={icon.value}
                    type="button"
                    onClick={() => handleSelect(icon.value)}
                    title={icon.label}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent text-foreground/80 hover:border-border hover:bg-accent/60"
                    )}
                  >
                    <icon.Icon className="h-5 w-5" />
                    <span className="w-full truncate text-center text-[10px] leading-tight text-muted-foreground">
                      {icon.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {filteredIcons.length} icon{filteredIcons.length === 1 ? "" : "s"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
