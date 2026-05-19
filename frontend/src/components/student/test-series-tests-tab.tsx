"use client";

import { motion } from "framer-motion";
import { Clock, FileText } from "lucide-react";
import { TestCard } from "@/components/common/test-card";
import { ClientTestInSeries } from "@/hooks/test-series-client";

interface TestSeriesTestsTabProps {
  tests: ClientTestInSeries[];
  isEnrolled: boolean;
  isLoading: boolean;
  testSeriesId?: string;
}

export function TestSeriesTestsTab({
  tests,
  isEnrolled,
  isLoading,
  testSeriesId,
}: TestSeriesTestsTabProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading tests...
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <div className="max-w-md mx-auto">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 animate-pulse" />
            </div>
            <FileText className="h-16 w-16 mx-auto text-primary relative z-10" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Tests Coming Soon!</h3>
          <p className="text-muted-foreground mb-4">
            We&apos;re currently preparing comprehensive tests for this series.
            Enroll now to get notified when they&apos;re available and enjoy
            early access.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expected soon</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header - Hidden on mobile, shown on desktop */}
      <div className="hidden lg:block mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          All Tests ({tests.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Complete all tests to master this series
        </p>
      </div>

      {/* Mobile Header - Compact */}
      <div className="lg:hidden mb-4">
        <h2 className="text-lg font-bold text-foreground">
          Tests ({tests.length})
        </h2>
      </div>

      {/* Tests Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.08,
            },
          },
        }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6"
      >
        {tests?.map((test, index) => (
          <motion.div
            key={test.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <TestCard
              id={test.id}
              title={test.title}
              durationMinutes={test.durationMinutes}
              totalMarks={test.totalMarks}
              isFree={test.isFree}
              attemptStatus={
                test.attemptStatus ||
                (test.hasAttempted ? "COMPLETED" : "NOT_STARTED")
              }
              isEnrolled={isEnrolled}
              isPurchased={isEnrolled}
              testLink={
                isEnrolled
                  ? `/student/tests/${test.id}/instructions${
                      testSeriesId ? `?testSeriesId=${testSeriesId}` : ""
                    }`
                  : undefined
              }
              questionCount={test.questionCount}
              attemptCount={test.attemptCount}
              hasAttempted={test.hasAttempted}
              sectionCount={test.sectionCount}
              index={index}
              showAnimation={false}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
