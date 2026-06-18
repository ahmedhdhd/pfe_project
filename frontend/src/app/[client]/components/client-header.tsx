"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Moon, Sun, Sparkles } from "@/components/icons";
import Link from "next/link";
import Image from "next/image";
import type { Client } from "@/lib/types/client";
import type { ClientHomepageData } from "../types";

interface ClientHeaderProps {
  client: Client;
  homepage: ClientHomepageData;
  theme: "light" | "dark" | "system";
  onToggleTheme: () => void;
}

export function ClientHeader({
  client,
  homepage,
  theme,
  onToggleTheme,
}: ClientHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/10 bg-background/60 backdrop-blur-2xl supports-backdrop-filter:bg-background/20 transition-all duration-300">
      <div className="absolute bottom-0 left-0 w-full h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
      <div className="px-4">
        <div className="container mx-auto py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo + brand */}
            <div className="flex items-center gap-3 md:gap-4 group cursor-pointer">
              <div className="relative h-11 w-11 rounded-xl bg-primary/5 flex items-center justify-center overflow-hidden ring-1 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300 shadow-sm backdrop-blur-md">
                <Image
                  src={client.logo}
                  alt={client.name}
                  width={44}
                  height={44}
                  className="object-contain p-1 group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-base md:text-lg font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
                    {client.name}
                  </h1>
                  <span className="hidden md:inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="mr-1 h-3 w-3" />
                    Powered by TeslaAcademy
                  </span>
                </div>
                {homepage.motto && (
                  <p className="hidden md:block text-xs text-muted-foreground line-clamp-1 font-medium">
                    {homepage.motto}
                  </p>
                )}
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2 md:gap-4">
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex text-[10px] md:text-xs px-2.5 py-1 h-7 bg-secondary/50 backdrop-blur-sm border-secondary-foreground/10"
              >
                {client.settings.maxUsers.toLocaleString()} learners capacity
              </Badge>
              <div className="h-6 w-px bg-border/60 hidden sm:block" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Toggle theme"
                className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={onToggleTheme}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                asChild
                size="sm"
                className="hidden sm:inline-flex h-9 px-5 rounded-full shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all bg-primary/90 hover:bg-primary backdrop-blur-sm"
              >
                <Link href={homepage.ctaUrl }>
                  Login
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="sm:hidden h-9 rounded-full"
              >
                <Link href={homepage.ctaUrl}>
                  Login
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
