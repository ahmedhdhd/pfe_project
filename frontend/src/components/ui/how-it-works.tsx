"use client";

import { cn } from "@/lib/utils";
import { UserPlus, BookOpen, GraduationCap } from "lucide-react";
import type React from "react";

// The main props for the HowItWorks component
interface HowItWorksProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

// The props for a single step card
interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

/**
 * A single step card within the "How It Works" section.
 * It displays an icon, title, description, and a list of benefits.
 */
const StepCard: React.FC<StepCardProps> = ({
  icon,
  title,
  description,
  benefits,
}) => (
  <div
    className={cn(
      "relative rounded-2xl border bg-card p-6 text-card-foreground transition-all duration-300 ease-in-out",
      "hover:scale-105 hover:shadow-lg hover:border-primary/50 hover:bg-muted"
    )}
  >
    {/* Icon */}
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-primary">
      {icon}
    </div>
    {/* Title and Description */}
    <h3 className="mb-2 text-xl font-semibold">{title}</h3>
    <p className="mb-6 text-muted-foreground">{description}</p>
    {/* Benefits List */}
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center gap-3">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
          </div>
          <span className="text-muted-foreground">{benefit}</span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * A responsive "How It Works" section that displays a 3-step process.
 * It is styled with shadcn/ui theme variables to support light and dark modes.
 */
export const HowItWorks: React.FC<HowItWorksProps> = ({
  className,
  ...props
}) => {
  const stepsData = [
    {
      icon: <UserPlus className="h-6 w-6" />,
      title: "Set Up Your Institution",
      description:
        "Create your organization account with custom branding, secure authentication, and team member management.",
      benefits: [
        "Multi-tenant architecture with secure data isolation",
        "Custom domain and branding options",
        "Role-based permissions for admins and staff",
      ],
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Create & Launch Courses",
      description:
        "Create engaging courses with rich content, upload materials, add quizzes, and organize your curriculum into subjects and chapters.",
      benefits: [
        "Drag-and-drop course builder",
        "Multiple content types (video, text, files)",
        "Automated grading and assessments",
      ],
    },
    {
      icon: <GraduationCap className="h-6 w-6" />,
      title: "Launch & Manage",
      description:
        "Assign teachers, create batches, enroll students, and track progress with real-time analytics and reports.",
      benefits: [
        "Batch management and scheduling",
        "Student enrollment and tracking",
        "Comprehensive analytics dashboard",
      ],
    },
  ];

  return (
    <section
      id="how-it-works"
      className={cn("w-full bg-background py-16 sm:py-24", className)}
      {...props}
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Get Started in Three Simple Steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Set up your institution&apos;s learning platform in minutes. From
            registration to launching your first course, TeslaAcademy makes it
            seamless.
          </p>
        </div>

        {/* Step Indicators with Connecting Line */}
        <div className="relative mx-auto mb-8 w-full max-w-4xl">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-0.5 w-[66.6667%] -translate-y-1/2 bg-border"
          ></div>
          {/* Use grid to align numbers with the card grid below */}
          <div className="relative grid grid-cols-3">
            {stepsData.map((_, index) => (
              <div
                key={index}
                // Center the number within its grid column
                className="flex h-8 w-8 items-center justify-center justify-self-center rounded-full bg-primary font-semibold text-primary-foreground ring-4 ring-background"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Steps Grid */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          {stepsData.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              benefits={step.benefits}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
