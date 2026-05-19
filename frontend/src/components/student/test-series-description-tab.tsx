"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Sparkles,
  FileText,
  Tag,
  Clock,
  Users,
  BarChart3,
  AlertCircle,
  Zap,
  Shield,
  Loader2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FAQDisplay } from "@/components/common/faq-display";
import { AtAGlanceCard } from "@/components/common/at-a-glance-card";
import { CollapsibleDescription } from "@/components/common/collapsible-description";
import { MobilePricingCard } from "@/components/common/mobile-pricing-card";
import { useOrgCurrency } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";
import {
  ClientTestSeriesListItem,
  ClientTestInSeries,
} from "@/hooks/test-series-client";
import { useState } from "react";

interface TestSeriesDescriptionTabProps {
  testSeries: ClientTestSeriesListItem;
  testCount: number;
  tests?: ClientTestInSeries[];
  finalPrice: number;
  savings: number;
  isHotDeal: boolean;
  isEnrolled: boolean;
  onEnroll: () => void;
  isProcessing: boolean;
}

export function TestSeriesDescriptionTab({
  testSeries,
  testCount,
  tests = [],
  finalPrice,
  savings,
  isHotDeal,
  isEnrolled,
  onEnroll,
  isProcessing,
}: TestSeriesDescriptionTabProps) {
  const [showAllTests, setShowAllTests] = useState(false);
  const currency = useOrgCurrency();
  const formatPrice = (price: number) =>
    formatCurrency(price, currency, {
      maximumFractionDigits: 0,
    });

  const pricePerTest = testCount > 0 ? finalPrice / testCount : 0;
  const displayTests = showAllTests ? tests : tests.slice(0, 3);

  // Prepare At-a-Glance items
  const atAGlanceItems = [
    {
      icon: FileText,
      label: "Total Tests",
      value: testCount > 0 ? `${testCount} Tests` : "Coming Soon",
      highlight: true,
    },
    ...(testSeries.durationDays > 0
      ? [
          {
            icon: Clock,
            label: "Validity",
            value: `${testSeries.durationDays} Days`,
          },
        ]
      : []),
    ...(testSeries.enrollmentCount !== undefined &&
    testSeries.enrollmentCount > 0
      ? [
          {
            icon: Users,
            label: "Enrolled",
            value: testSeries.enrollmentCount.toLocaleString(),
          },
        ]
      : []),
    ...(testSeries.averageScore !== undefined
      ? [
          {
            icon: TrendingUp,
            label: "Avg Score",
            value: `${testSeries.averageScore}%`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 lg:space-y-0">
      {/* MOBILE-FIRST LAYOUT */}

      {/* 1. At-a-Glance Card (Mobile Only) */}
      <AtAGlanceCard items={atAGlanceItems} />

      {/* 2. Mobile Pricing Card (Mobile Only) */}
      <MobilePricingCard
        originalPrice={testSeries.totalPrice}
        finalPrice={finalPrice}
        savings={savings}
        discountPercentage={testSeries.discountPercentage}
        isFree={testSeries.isFree}
        isEnrolled={isEnrolled}
        isProcessing={isProcessing}
        isDisabled={testCount === 0}
        disabledReason={testCount === 0 ? "Tests coming soon" : undefined}
        onEnrollClick={onEnroll}
        ctaText={testSeries.isFree ? "Enroll for Free" : "Enroll Now"}
      />

      {/* 3. Desktop Grid Layout */}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left: Description & Features */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alert for 0 tests */}
          {testCount === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <div className="font-semibold mb-1">Tests Coming Soon!</div>
                  <p className="text-sm">
                    This test series is being prepared. Enroll now to get
                    notified when tests are available and enjoy early access.
                  </p>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Social Proof & Engagement Metrics */}
          {(testSeries.enrollmentCount ||
            testSeries.averageScore ||
            testSeries.totalAttempts) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <Card className="bg-linear-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {testSeries.enrollmentCount !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-foreground">
                            {testSeries.enrollmentCount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Students Enrolled
                          </div>
                        </div>
                      </div>
                    )}
                    {testSeries.averageScore !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-foreground">
                            {testSeries.averageScore}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Average Score
                          </div>
                        </div>
                      </div>
                    )}
                    {testSeries.totalAttempts !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-foreground">
                            {testSeries.totalAttempts.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total Attempts
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Test Preview */}
          {testCount > 0 && tests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Tests Included ({testCount})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {displayTests.map((test, index) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {test.title}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {test.durationMinutes} min
                            </span>
                            <span>{test.totalMarks} marks</span>
                            {test.isFree && (
                              <Badge variant="secondary" className="text-xs">
                                Free
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {tests.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setShowAllTests(!showAllTests)}
                    >
                      {showAllTests
                        ? "Show Less"
                        : `View All ${tests.length} Tests`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Description with Collapsible on Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  About This Test Series
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testSeries.description?.html ? (
                  <CollapsibleDescription
                    html={testSeries.description.html}
                    maxHeight={180}
                  />
                ) : (
                  <CollapsibleDescription
                    plainText="This comprehensive test series is designed to help you excel in your exam preparation. Get access to carefully curated tests that mirror the actual exam pattern and difficulty.

Each test includes detailed explanations, performance analytics, and personalized feedback to help you identify strengths and areas for improvement."
                    maxHeight={120}
                  />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <FAQDisplay faqs={testSeries?.faq} />
          </motion.div>
        </div>

        {/* Right: Price Card & Info (Desktop Only) */}
        <div className="lg:col-span-1 hidden lg:block">
          {/* Sticky Container for both cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:sticky lg:top-28 lg:self-start lg:z-10 space-y-4"
          >
            <Card className="shadow-xl border-2 bg-background relative p-0">
              <CardContent className="p-6 space-y-6">
                {/* Social Proof Badge */}
                {testSeries.enrollmentCount !== undefined &&
                  testSeries.enrollmentCount > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-foreground">
                        Join {testSeries.enrollmentCount.toLocaleString()}+
                        students
                      </span>
                    </div>
                  )}

                {/* Thumbnail Image */}
                <div className="relative aspect-video rounded-xl overflow-hidden border-2">
                  {testSeries.imageUrl ? (
                    <img
                      src={testSeries.imageUrl}
                      alt={testSeries.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-linear-to-br from-blue-500/10 to-purple-500/10">
                      <FileText className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Badges on Image */}
                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                    {isHotDeal && (
                      <Badge className="bg-linear-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Hot Deal
                      </Badge>
                    )}
                    {testSeries.discountPercentage > 0 && !isEnrolled && (
                      <Badge className="bg-red-500 text-white border-0 shadow-lg text-xs ml-auto">
                        {testSeries.discountPercentage}% OFF
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Enhanced Pricing - Only show if not enrolled */}
                {!isEnrolled && (
                  <>
                    <div className="space-y-4">
                      {testSeries.isFree ? (
                        <div className="text-center space-y-2">
                          <div className="text-4xl sm:text-5xl font-bold text-green-600">
                            Free
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Complete access to all tests
                          </p>
                        </div>
                      ) : (
                        <>
                          {testSeries.discountPercentage > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground line-through">
                                  {formatPrice(testSeries.totalPrice)}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold"
                                >
                                  Save {formatPrice(savings)}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {testSeries.discountPercentage}% discount
                                applied
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-4xl sm:text-5xl font-bold text-primary">
                                {formatPrice(finalPrice)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                total
                              </span>
                            </div>
                            {testCount > 0 &&
                              pricePerTest > 0 &&
                              !isEnrolled && (
                                <div className="text-xs text-muted-foreground">
                                  Just {formatPrice(pricePerTest)} per test
                                </div>
                              )}
                          </div>
                        </>
                      )}
                    </div>

                    <Separator />

                    {/* Enhanced Action Button */}
                    <div className="space-y-3">
                      <Button
                        className="w-full h-12 text-base font-semibold"
                        size="lg"
                        onClick={onEnroll}
                        disabled={isProcessing || testCount === 0}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : testCount === 0 ? (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Coming Soon
                          </>
                        ) : testSeries.isFree ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Enroll for Free
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Enroll Now
                          </>
                        )}
                      </Button>
                      {testCount === 0 && (
                        <p className="text-xs text-center text-muted-foreground">
                          Get notified when tests are available
                        </p>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Enhanced Quick Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">
                        {testCount > 0 ? testCount : "Coming Soon"}
                      </span>{" "}
                      {testCount === 1 ? "Test" : "Tests"} included
                    </div>
                  </div>
                  {testSeries.durationDays > 0 && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        Valid for{" "}
                        <span className="font-semibold text-foreground">
                          {testSeries.durationDays}
                        </span>{" "}
                        {testSeries.durationDays === 1 ? "day" : "days"}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-sm">Detailed performance analysis</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-sm">7-day money-back guarantee</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Series Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Test Series Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <InfoItem icon={Tag} label="Exam" value={testSeries.exam} />
                    <InfoItem
                      icon={FileText}
                      label="Tests"
                      value={
                        testCount > 0
                          ? `${testCount} ${testCount === 1 ? "test" : "tests"}`
                          : "Coming Soon"
                      }
                    />
                    {testSeries.durationDays > 0 && (
                      <InfoItem
                        icon={Clock}
                        label="Duration"
                        value={`${testSeries.durationDays} ${
                          testSeries.durationDays === 1 ? "day" : "days"
                        }`}
                      />
                    )}
                    {testCount > 0 && pricePerTest > 0 && !isEnrolled && (
                      <InfoItem
                        icon={Tag}
                        label="Price per Test"
                        value={formatPrice(pricePerTest)}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Info Item Component
function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
