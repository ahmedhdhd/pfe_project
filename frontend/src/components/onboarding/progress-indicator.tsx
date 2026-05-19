"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  className?: string;
}

export function ProgressIndicator({
  currentStep,
  totalSteps = 4,
  className = "",
}: ProgressIndicatorProps) {
  // const { isStepComplete } = useOnboardingProgress();

  const steps = [
    {
      number: 1,
      title: "Create Organization",
      description: "Set up your organization",
    },
    { number: 2, title: "Register Admin", description: "Create admin account" },
    { number: 3, title: "Verify Email", description: "Confirm email address" },
    { number: 4, title: "Set Password", description: "Secure your account" },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
            {currentStep}
          </div>
          <span className="text-sm font-medium">
            {steps[currentStep - 1]?.title}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
      </div>

      {/* Step List */}
      <div className="grid grid-cols-2 gap-2">
        {steps.map((step) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: step.number * 0.1 }}
            className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
              step.number === currentStep
                ? "bg-primary/10 text-primary"
                : step.number < currentStep
                ? "bg-green-50 text-green-700"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step.number < currentStep
                  ? "bg-green-500 text-white"
                  : step.number === currentStep
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step.number < currentStep ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                step.number
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{step.title}</p>
              <p className="text-xs opacity-75 truncate">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default ProgressIndicator;
