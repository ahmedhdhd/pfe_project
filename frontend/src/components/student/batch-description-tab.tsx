"use client";

import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Loader2,
  MessageSquare,
  Sparkles,
  Tag,
  Calendar,
  PlayCircle,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AtAGlanceCard } from "@/components/common/at-a-glance-card";
import { CollapsibleDescription } from "@/components/common/collapsible-description";
import { MobilePricingCard } from "@/components/common/mobile-pricing-card";
import { PremiumTabsTrigger } from "@/components/common/premium-tabs-trigger";
import { UnifiedVideoPlayer } from "@/components/common/unified-video-player";
import { CourseCertificateSection } from "@/components/student/course-certificate-section";
import { CourseEvaluationsSection } from "@/components/student/course-evaluations-section";
import {
  useEnrollFreeBatch,
  useGetClientCourseOutline,
} from "@/hooks";
import {
  buildStudentChapterContentPath,
  getFirstCourseOutlineLessonLocation,
  type CourseOutlineChapter,
} from "@/lib/course-navigation";
import { useOrgCurrency, useOrgPaymentMode } from "@/lib/store/organization-config";
import { useStudentCourseCartStore } from "@/lib/store/student-course-cart";
import { getVideoMimeType } from "@/components/student/course/utils";
import { formatCurrency } from "@/lib/utils/format";
import { useSubscriptionStatus } from "@/hooks/api";
import { useSubscriptionPayment } from "@/hooks/use-subscription-payment";

interface BatchDescriptionTabProps {
  batch: {
    id: string;
    description?: string | null;
    imageUrl?: string;
    introVideoUrl?: string | null;
    introVideoType?: string | null;
    totalPrice: number;
    discountPercentage: number;
    name: string;
    language: string;
    class?: "11" | "12" | "12+" | "Grad" | string;
    exam?: string;
    category?: {
      id: string;
      name: string;
    } | null;
    startDate: Date | string;
    endDate: Date | string;
    faq?: Array<{
      title: string;
      description: string;
    }>;
    isPurchased?: boolean;
    averageRating?: number;
    ratingCount?: number;
    reviewCount?: number;
    reviews?: Array<{
      id: string;
      batchId: string;
      userId: string;
      rating: number;
      comment: string;
      createdAt: string;
      updatedAt: string;
      user?: {
        id: string;
        username: string;
        profileImg?: string | null;
      };
    }>;
    viewerReview?: {
      id: string;
      batchId: string;
      userId: string;
      rating: number;
      comment: string;
      createdAt: string;
      updatedAt: string;
      user?: {
        id: string;
        username: string;
        profileImg?: string | null;
      };
    } | null;
  };
  finalPrice: number;
  savings: number;
  isHotDeal: boolean;
}

export function BatchDescriptionTab({
  batch,
  finalPrice,
  savings,
  isHotDeal,
}: BatchDescriptionTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currency = useOrgCurrency();
  const enrollFreeMutation = useEnrollFreeBatch();
  const { data: hierarchyResponse } = useGetClientCourseOutline(batch.id);
  const paymentMode = useOrgPaymentMode();
  const { data: subStatus } = useSubscriptionStatus();
  const { initializePayment: initSubscription, isLoading: isSubLoading } = useSubscriptionPayment();
  const addCartItem = useStudentCourseCartStore((state) => state.addItem);
  const removeCartItem = useStudentCourseCartStore((state) => state.removeItem);
  const hasCartItem = useStudentCourseCartStore((state) =>
    state.items.some((item) => item.id === batch.id)
  );

  const startDate = new Date(batch.startDate);
  const endDate = new Date(batch.endDate);
  const durationDays = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const hierarchy =
    (hierarchyResponse?.data as CourseOutlineChapter[] | undefined) || [];
  const firstContentLocation = getFirstCourseOutlineLessonLocation(hierarchy);
  const attendHref = firstContentLocation
    ? buildStudentChapterContentPath(batch.id, firstContentLocation)
    : null;
  const introHref = batch.introVideoUrl
    ? `/student/batches/${batch.id}/intro`
    : null;
  const courseStartHref = introHref || attendHref;

  const isFreeMode = paymentMode === 'free';
  const isSubscriptionMode = paymentMode === 'subscription';
  const isPerCourseMode = paymentMode === "per_course";
  const showCoursePricing = isPerCourseMode;
  const isSubscribed = subStatus?.data?.isSubscribed || false;
  const isLoading = enrollFreeMutation.isPending || isSubLoading;
  const [hasLocalEnrollment, setHasLocalEnrollment] = useState(
    Boolean(batch.isPurchased) ||
      (typeof window !== "undefined" &&
        window.sessionStorage.getItem(`enrolled-batch-${batch.id}`) === "true")
  );
  const isEnrolled = Boolean(batch.isPurchased || hasLocalEnrollment);

  useEffect(() => {
    if (batch.isPurchased) {
      setHasLocalEnrollment(true);
    }
  }, [batch.id, batch.isPurchased]);

  useEffect(() => {
    if (isEnrolled && hasCartItem) {
      removeCartItem(batch.id);
    }
  }, [batch.id, hasCartItem, isEnrolled, removeCartItem]);

  const hierarchyStats = hierarchy.reduce(
    (totals, chapter) => {
      totals.chapters += 1;
      for (const topic of chapter.topics || []) {
        totals.topics += 1;
        totals.contents += topic.contents?.length || 0;
      }
      return totals;
    },
    { subjects: 0, chapters: 0, topics: 0, contents: 0 }
  );

  const primaryActionLabel = isEnrolled ? "Open course" : "Enroll";

  const handleAddToCart = () => {
    if (isEnrolled) {
      handleAttendClick();
      return;
    }

    if (!isPerCourseMode) {
      return;
    }

    if (hasCartItem) {
      removeCartItem(batch.id);
      toast.success("Removed from cart.");
      return;
    }

    addCartItem({
      id: batch.id,
      title: batch.name,
      imageUrl: batch.imageUrl,
      category: batch.category?.name || null,
      language: batch.language || null,
      totalPrice: batch.totalPrice,
      discountPercentage: batch.discountPercentage,
      finalPrice,
    });
    toast.success("Course added to cart.");
  };

  const handleEnrollFree = async () => {
    if (!batch.id) return;

    toast.loading("Enrolling in course...");

    enrollFreeMutation.mutate(batch.id, {
      onSuccess: () => {
        setHasLocalEnrollment(true);
        window.sessionStorage.setItem(`enrolled-batch-${batch.id}`, "true");
        queryClient.setQueryData(["explore", "batch", batch.id], (current: unknown) => {
          if (!current || typeof current !== "object" || !("data" in current)) {
            return current;
          }

          const currentResponse = current as { data?: Record<string, unknown> };

          return {
            ...currentResponse,
            data: {
              ...currentResponse.data,
              isPurchased: true,
            },
          };
        });
        queryClient.invalidateQueries({ queryKey: ["explore", "batch", batch.id] });
        queryClient.invalidateQueries({ queryKey: ["explore", "batches"] });
        queryClient.invalidateQueries({ queryKey: ["myBatches"] });
        toast.dismiss();
        toast.success("Enrolled successfully.");
        if (courseStartHref) {
          router.push(courseStartHref);
        } else {
          router.push("/student/my-learning");
        }
      },
      onError: (error) => {
        toast.dismiss();
        console.error("Enrollment failed:", error);

        const errorMessage =
          (error && typeof error === "object" && "response" in error
            ? (error.response as { data?: { message?: string } })?.data?.message
            : null) ||
          (error instanceof Error ? error.message : null) ||
          "Enrollment failed. Please try again.";

        toast.error("Enrollment failed", {
          description: errorMessage,
        });
      },
    });
  };

  const handleEnrollClick = () => {
    if (isEnrolled) {
      handleAttendClick();
      return;
    }

    if (isFreeMode || finalPrice === 0 || (isSubscriptionMode && isSubscribed)) {
      handleEnrollFree();
      return;
    }

    // Subscription mode but not yet subscribed: redirect to subscription checkout
    if (isSubscriptionMode && !isSubscribed) {
      toast.loading("Redirecting to subscription checkout...");
      initSubscription((error) => {
        toast.dismiss();
        const errorMessage =
          (error && typeof error === "object" && "response" in error
            ? (error.response as { data?: { message?: string } })?.data?.message
            : null) ||
          (error instanceof Error ? error.message : null) ||
          "Subscription checkout failed. Please try again.";
        toast.error("Subscription failed", { description: errorMessage });
      });
      return;
    }

    if (!isPerCourseMode && !isSubscriptionMode && !isFreeMode) {
      toast.error("Course access mode is not available right now.");
      return;
    }

    router.push(`/student/checkout?courseId=${batch.id}`);
  };

  const handleAttendClick = () => {
    if (!isEnrolled) {
      toast.error("Enroll in this course first to start attending.");
      return;
    }

    if (!courseStartHref) {
      toast.error("No course content has been added yet.");
      return;
    }

    router.push(courseStartHref);
  };

  const atAGlanceItems = [
    {
      icon: Calendar,
      label: "Start Date",
      value: startDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      highlight: true,
    },
    {
      icon: Clock,
      label: "Duration",
      value: `${durationDays} Days`,
    },
    {
      icon: Globe,
      label: "Language",
      value: batch.language,
    },
    ...(batch.category?.name
      ? [
          {
            icon: Tag,
            label: "Category",
            value: batch.category.name,
          },
        ]
      : []),
    ...(batch.class
      ? [
          {
            icon: GraduationCap,
            label: "Class",
            value: `Class ${batch.class}`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4 lg:space-y-0">
      <AtAGlanceCard items={atAGlanceItems} title="Course Details" />

      {!isEnrolled && showCoursePricing && (
        <MobilePricingCard
          originalPrice={batch.totalPrice}
          finalPrice={finalPrice}
          savings={savings}
          discountPercentage={batch.discountPercentage}
          isEnrolled={isEnrolled}
          isProcessing={isLoading}
          onEnrollClick={handleEnrollClick}
          onSecondaryActionClick={handleAddToCart}
          ctaText="Buy"
          secondaryCtaText={hasCartItem ? "Remove from cart" : "Add to cart"}
          enrolledText="You're enrolled in this course"
        />
      )}

      <div className="lg:hidden" data-course-actions>
          <Card>
            <CardHeader>
              <CardTitle>Course Actions</CardTitle>
            </CardHeader>
          <CardContent
            className={isPerCourseMode && !isEnrolled ? "grid grid-cols-1 gap-3 sm:grid-cols-2" : ""}
          >
            {isPerCourseMode && !isEnrolled ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={isLoading}
                  data-add-to-cart-button
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {hasCartItem ? "Remove from cart" : "Add to cart"}
                </Button>
                <Button onClick={handleEnrollClick} disabled={isLoading} data-buy-button>
                  Buy
                </Button>
              </>
            ) : (
              <Button
                variant={isEnrolled ? "secondary" : "default"}
                onClick={handleEnrollClick}
                disabled={isLoading}
                data-primary-course-action
              >
                {primaryActionLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <Card className="overflow-hidden">
              <div className="relative aspect-[16/7] w-full bg-muted">
                {batch.introVideoUrl ? (
                  <UnifiedVideoPlayer
                    src={batch.introVideoUrl}
                    poster={batch.imageUrl}
                    type={getVideoMimeType(
                      batch.introVideoType || undefined,
                      batch.introVideoUrl
                    )}
                    className="h-full w-full"
                    autoplay={false}
                  />
                ) : batch.imageUrl ? (
                  <img
                    src={batch.imageUrl}
                    alt={batch.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-linear-to-br from-slate-100 via-white to-slate-200 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
                    <GraduationCap className="h-20 w-20 text-muted-foreground/35" />
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Tabs defaultValue="presentation" className="space-y-5">
              <TabsList className="flex h-11 w-full items-center justify-start gap-2 overflow-x-auto rounded-lg border-b border-border/60 bg-transparent p-0">
                <PremiumTabsTrigger
                  value="presentation"
                  icon={BookOpen}
                  mobileLabel="Info"
                >
                  Presentation
                </PremiumTabsTrigger>
                <PremiumTabsTrigger
                  value="evaluation"
                  icon={MessageSquare}
                  mobileLabel="Reviews"
                >
                  Evaluation
                </PremiumTabsTrigger>
              </TabsList>

              <TabsContent
                value="presentation"
                className="m-0 space-y-8 focus-visible:outline-none"
              >
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                          {batch.name}
                        </h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {batch.category?.name ? (
                            <Badge variant="secondary">{batch.category.name}</Badge>
                          ) : null}
                          {batch.exam ? (
                            <Badge variant="outline">{batch.exam}</Badge>
                          ) : null}
                          {batch.class ? (
                            <Badge variant="outline">Class {batch.class}</Badge>
                          ) : null}
                          <Badge variant="outline">{batch.language}</Badge>
                        </div>
                      </div>

                      {batch.description ? (
                        <CollapsibleDescription
                          html={batch.description}
                          maxHeight={220}
                        />
                      ) : (
                        <CollapsibleDescription
                          plainText="No description available for this course."
                          maxHeight={100}
                        />
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Certificate</h3>
                      </div>
                      <CourseCertificateSection
                        batchId={batch.id}
                        isPurchased={isEnrolled}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-5">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Course Hierarchy</h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{hierarchyStats.chapters} chapters</span>
                        <span>{hierarchyStats.topics} topics</span>
                        <span>{hierarchyStats.contents} contents</span>
                      </div>

                      {hierarchy.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No hierarchy has been added to this course yet.
                        </p>
                      ) : (
                        <Accordion
                          type="multiple"
                          className="overflow-hidden rounded-xl border border-border/70"
                        >
                          {hierarchy.map((chapter, chapterIndex) => {
                            const topicCount = (chapter.topics || []).length;
                            const contentCount = (chapter.topics || []).reduce(
                              (topicSum, topic) =>
                                topicSum + (topic.contents?.length || 0),
                              0
                            );

                            return (
                              <AccordionItem
                                key={chapter.id}
                                value={chapter.id}
                                className="border-b border-border/70 bg-background"
                              >
                                <AccordionTrigger className="px-4 hover:no-underline sm:px-5">
                                  <div className="flex w-full flex-col gap-2 text-left">
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-semibold text-foreground">
                                        Chapter {chapterIndex + 1}: {chapter.name}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                      <span>{topicCount} topics</span>
                                      <span>{contentCount} contents</span>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="border-t border-border/60 bg-muted/20 px-0 pb-0">
                                  <div className="divide-y divide-border/60">
                                    <div className="px-4 py-4 sm:px-5">
                                      <div className="space-y-2">
                                        {(chapter.topics || []).map((topic, topicIndex) => (
                                          <div
                                            key={topic.id}
                                            className="rounded-lg border border-border/50 bg-background px-3 py-3"
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <div className="flex items-center gap-2">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium text-foreground">
                                                  Topic {topicIndex + 1}: {topic.name}
                                                </span>
                                              </div>
                                              <span className="text-xs text-muted-foreground">
                                                {(topic.contents || []).length} items
                                              </span>
                                            </div>

                                            {(topic.contents || []).length > 0 ? (
                                              <div className="mt-3 space-y-2">
                                                {(topic.contents || []).map((content, contentIndex) => (
                                                  <div
                                                    key={content.id}
                                                    className="flex items-center justify-between gap-3 rounded-md bg-muted/35 px-3 py-2"
                                                  >
                                                    <div className="flex items-center gap-2 text-sm">
                                                      {content.type === "PDF" ? (
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                      ) : (
                                                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                                      )}
                                                      <span className="text-foreground">
                                                        {contentIndex + 1}.{" "}
                                                        {content.name ||
                                                          content.title ||
                                                          "Untitled content"}
                                                      </span>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                      {content.type === "PDF" ? "PDF" : "Video"}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="mt-3 text-xs text-muted-foreground">
                                                No content inside this topic yet.
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">
                          Frequently Asked Questions
                        </h3>
                      </div>

                      {batch.faq?.length ? (
                        <Accordion
                          type="single"
                          collapsible
                          className="rounded-xl border border-border/70"
                        >
                          {batch.faq.map((faq, index) => (
                            <AccordionItem
                              key={`${faq.title}-${index}`}
                              value={`faq-${index}`}
                              className="border-b border-border/60 last:border-b-0"
                            >
                              <AccordionTrigger className="px-4 text-left hover:no-underline">
                                <span className="text-sm font-medium text-foreground">
                                  {faq.title || `Question ${index + 1}`}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 text-sm leading-6 text-muted-foreground">
                                {faq.description || "No answer provided yet."}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No frequently asked questions have been added yet.
                        </p>
                      )}
                    </div>
              </TabsContent>

              <TabsContent
                value="evaluation"
                className="m-0 focus-visible:outline-none"
              >
                <CourseEvaluationsSection
                  batchId={batch.id}
                  canReview={isEnrolled}
                  averageRating={batch.averageRating}
                  ratingCount={batch.ratingCount}
                  reviewCount={batch.reviewCount}
                  reviews={batch.reviews}
                  viewerReview={batch.viewerReview}
                  readOnly
                  embedded
                  showSummary={false}
                />
              </TabsContent>
            </Tabs>
          </motion.div>

        </div>

        <div className="hidden space-y-4 lg:block">
          {isEnrolled ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Card data-course-actions>
                <CardHeader>
                  <CardTitle>Course Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={handleAttendClick}
                    data-primary-course-action
                  >
                    Open course
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <Card
                className="shadow-xl border-2"
                data-pricing-card={showCoursePricing ? true : undefined}
                data-course-actions
              >
                <CardContent className="space-y-6 p-6">
                  <div className="relative aspect-video overflow-hidden rounded-xl border-2">
                    {batch.imageUrl ? (
                      <img
                        src={batch.imageUrl}
                        alt={batch.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-linear-to-br from-blue-500/10 to-emerald-500/10">
                        <GraduationCap className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}

                    <div className="absolute left-2 right-2 top-2 flex items-start justify-between gap-2">
                      {showCoursePricing && isHotDeal && (
                        <Badge className="border-0 bg-linear-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                          <Sparkles className="mr-1 h-3 w-3" />
                          Hot Deal
                        </Badge>
                      )}
                      {showCoursePricing && batch.discountPercentage > 0 && (
                        <Badge className="ml-auto border-0 bg-red-500 text-white shadow-lg">
                          {batch.discountPercentage}% OFF
                        </Badge>
                      )}
                    </div>
                  </div>

                  {showCoursePricing && (
                  <div className="space-y-3">
                    {batch.discountPercentage > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground line-through">
                          {formatCurrency(batch.totalPrice, currency)}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                        >
                          Save {formatCurrency(savings, currency)}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(finalPrice, currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        total
                      </span>
                    </div>
                  </div>
                  )}

                  <Separator />

                  {isPerCourseMode && !isEnrolled ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={handleAddToCart}
                        disabled={isLoading}
                        data-add-to-cart-button
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {hasCartItem ? "Remove from cart" : "Add to cart"}
                      </Button>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={handleEnrollClick}
                        disabled={isLoading}
                        data-buy-button
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Buy
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      variant={isEnrolled ? "secondary" : "default"}
                      onClick={handleEnrollClick}
                      disabled={isLoading}
                      data-primary-course-action
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          {primaryActionLabel}
                        </>
                      )}
                    </Button>
                  )}

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>Access all published lessons</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>Resume from the first available topic</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoItem
                  icon={Calendar}
                  label="Start Date"
                  value={startDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <InfoItem
                  icon={Calendar}
                  label="End Date"
                  value={endDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <InfoItem icon={Globe} label="Language" value={batch.language} />
                {batch.category?.name && (
                  <InfoItem
                    icon={Tag}
                    label="Category"
                    value={batch.category.name}
                  />
                )}
                {batch.class && (
                  <InfoItem
                    icon={GraduationCap}
                    label="Class"
                    value={batch.class}
                  />
                )}
                {batch.exam && (
                  <InfoItem icon={BookOpen} label="Exam" value={batch.exam} />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
