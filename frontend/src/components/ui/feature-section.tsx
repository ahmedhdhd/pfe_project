"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Define the types for the component props for type safety and clarity
interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface CallToAction {
  title: string;
  description: string;
  primaryAction: {
    text: string;
    url: string;
  };
  secondaryAction?: {
    text: string;
    url: string;
  };
}

export interface FeatureSectionProps extends React.HTMLAttributes<HTMLElement> {
  mainIcon: React.ReactNode;
  title: string;
  subtitle: string;
  features: Feature[];
  callToAction: CallToAction;
}

const FeatureSection = React.forwardRef<HTMLElement, FeatureSectionProps>(
  (
    { mainIcon, title, subtitle, features, callToAction, className, ...props },
    ref
  ) => {
    return (
      <section
        ref={ref}
        className={cn(
          "container mx-auto max-w-5xl py-12 sm:py-24 px-4",
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center text-center">
          {/* Main Icon */}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {mainIcon}
          </div>

          {/* Main Title and Subtitle */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {subtitle}
          </p>
        </div>

        {/* Features Grid */}
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-left sm:mt-20 lg:max-w-none lg:grid-cols-2">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-x-6">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/10 text-primary">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold leading-7 text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1 text-base leading-7 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action Card */}
        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center sm:mt-20 shadow-lg">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {callToAction.title}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {callToAction.description}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="w-full sm:w-auto">
              <a href={callToAction.primaryAction.url}>
                {callToAction.primaryAction.text}
              </a>
            </Button>
            {callToAction.secondaryAction && (
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href={callToAction.secondaryAction.url}>
                  {callToAction.secondaryAction.text}
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }
);
FeatureSection.displayName = "FeatureSection";

export { FeatureSection };
