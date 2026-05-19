"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { ClientHomepageData } from "../types";
import { BannerCarousel } from "./banner-carousel";
import { TypewriterText } from "./typewriter-text";
import { cn } from "@/lib/utils";

interface ClientHeroSectionProps {
  homepage: ClientHomepageData;
}

function Spotlight({
  className = "",
  fill = "white",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      className={cn(
        "animate-spotlight pointer-events-none absolute z-1  h-[169%] w-[138%] lg:w-[84%] opacity-0",
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
    >
      <g filter="url(#filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </svg>
  );
}

export function ClientHeroSection({ homepage }: ClientHeroSectionProps) {
  return (
    <section className="relative pb-20 md:pb-32 overflow-hidden bg-background/96 antialiased bg-grid-white/[0.02]">
      {/* Spotlight Effect */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="var(--primary)"
      />

      {/* Background Elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute h-full w-full bg-background mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] opacity-[0.1] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
      </div>

      {/* Full-width banner at top */}
      {homepage.bannerUrls.length > 0 && (
        <div className="w-full mb-8 relative z-20">
          <BannerCarousel banners={homepage.bannerUrls} />
        </div>
      )}

      {/* Text + CTA */}
      <div className="px-4 relative z-10">
        <div className="container mx-auto max-w-6xl pt-10 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl flex flex-col items-center text-center gap-8"
          >
            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center justify-center"
              >
                <span className="relative inline-block overflow-hidden rounded-full p-px">
                  <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                  <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-background/90 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-3xl">
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Modern learning experience
                  </div>
                </span>
              </motion.div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight relative">
                <span className="bg-clip-text text-transparent bg-linear-to-b from-foreground to-foreground/70">
                  {homepage.title}
                </span>
              </h1>

              <div className="text-xl md:text-2xl text-muted-foreground font-light h-12 flex items-center justify-center">
                <TypewriterText text={homepage.tagline} />
              </div>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {homepage.description}
              </p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Button
                  size="lg"
                  className="h-12 px-8 text-base rounded-full shadow-[0_0_20px_-5px_var(--primary)] hover:shadow-[0_0_30px_-5px_var(--primary)] transition-all duration-300 bg-primary text-primary-foreground border border-primary/20"
                  asChild
                >
                  <Link href={homepage.ctaUrl}>
                    {homepage.ctaText}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80 border-primary/20 hover:border-primary/50 transition-all duration-300"
                  asChild
                >
                  <Link href="#features">Explore features</Link>
                </Button>
              </motion.div>

              <p className="text-sm text-muted-foreground pt-4 opacity-60">
                No complicated setup. Start learning in minutes.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
