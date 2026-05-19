"use client";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import {
  GraduationCap,
  Brain,
  TrendingUp,
  Building2,
  Clock,
  Microscope,
  Briefcase,
  BarChart3,
  Users,
} from "lucide-react";
import type { ClientHomepageData, ClientHomepageFeature } from "../types";
import type { Client } from "@/lib/types/client";
import React from "react";

interface ClientFeaturesSectionProps {
  homepage: ClientHomepageData;
  client: Client;
}

const featureIcons = {
  brain: Brain,
  "graduation-cap": GraduationCap,
  "chart-line": TrendingUp,
  university: Building2,
  clock: Clock,
  microscope: Microscope,
  briefcase: Briefcase,
  "file-chart": BarChart3,
  users: Users,
} as const;

function getFeatureIcon(iconName: string) {
  const IconComponent =
    featureIcons[iconName as keyof typeof featureIcons] || Brain;
  return <IconComponent className="h-6 w-6" />;
}

function FeatureCard({ feature, index }: { feature: ClientHomepageFeature; index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 * index }}
      className="group relative border border-border/50 bg-background/50 backdrop-blur-sm rounded-2xl overflow-hidden hover:border-primary/20 transition-colors duration-500"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              var(--primary),
              transparent 80%
            )
          `,
          opacity: 0.15,
        }}
      />
      <div className="relative h-full p-6 flex flex-col gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
          {getFeatureIcon(feature.icon)}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
            {feature.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ClientFeaturesSection({
  homepage,
  client,
}: ClientFeaturesSectionProps) {
  if (!homepage.features.length) return null;

  return (
    <section id="features" className="py-20 md:py-32 bg-muted/10 relative">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] -z-10" />
      <div className="px-4">
        <div className="container mx-auto max-w-6xl space-y-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto space-y-4"
          >
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              Why learners pick {client.name}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Built for clear, structured learning.
            </h2>
            <p className="text-lg text-muted-foreground">
              Each feature is designed to keep learners focused, guided, and
              confident—from the first module to the final assessment.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {homepage.features.map((feature, index) => (
              <FeatureCard key={feature.id} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
