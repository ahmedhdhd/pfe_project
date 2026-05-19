"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, lazy, useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetExploreBatch } from "@/hooks";
import { StudentHeader } from "@/components/student/student-header";
import { BatchDetailHeader } from "@/components/student/batch-detail-header";
import { MobileBatchHero } from "@/components/student/mobile-batch-hero";
import { MobileBatchTabs } from "@/components/student/mobile-batch-tabs";
import { DescriptionPageShimmer } from "@/components/common/description-page-shimmer";
import { useOrgCurrency, useOrgPaymentMode } from "@/lib/store/organization-config";
import { formatCurrency } from "@/lib/utils/format";

// Lazy load tab content components
const BatchDescriptionTab = lazy(() =>
  import("@/components/student/batch-description-tab").then((mod) => ({
    default: mod.BatchDescriptionTab,
  }))
);

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const currency = useOrgCurrency();
  const paymentMode = useOrgPaymentMode();
  const showCoursePricing = paymentMode === "per_course";

  // Get tab from URL params, default to "description"
  const tabFromUrl = searchParams.get("tab") as "description" | null;
  const [activeTab, setActiveTab] = useState<"description">("description");

  // Update tab when URL param changes
  useEffect(() => {
    if (tabFromUrl === "description") {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const { data, isLoading, error } = useGetExploreBatch(id);

  if (isLoading) {
    return (
      <div className="p-2.5 lg:px-10 lg:py-8 bg-background">
        <DescriptionPageShimmer />
      </div>
    );
  }

  if (error || !data?.success || !data?.data) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8 bg-background">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="text-6xl">😕</div>
          <h2 className="text-2xl font-bold text-foreground">
            Batch Not Found
          </h2>
          <p className="text-muted-foreground">
            The batch you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const batch = data.data;
  const finalPrice = Math.round(
    batch.totalPrice * (1 - batch.discountPercentage / 100)
  );
  const savings = batch.totalPrice - finalPrice;
  const isHotDeal = batch.discountPercentage >= 30;

  // Handle tab change and update URL
  const handleTabChange = (tab: "description") => {
    setActiveTab(tab);
    // Update URL without adding to history to avoid back loop
    const newUrl = `/student/batches/${id}${
      tab !== "description" ? `?tab=${tab}` : ""
    }`;
    router.replace(newUrl, { scroll: false });
  };

  return (
    <div className="h-full bg-background">
      {/* Desktop Header */}
      <div className="hidden lg:block">
        <StudentHeader />
        <div className="sticky top-0 z-50">
          <BatchDetailHeader
            batch={batch}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onBack={() => router.push("/student/explore")}
          />
        </div>
      </div>

      {/* Mobile Hero - Sticky on Scroll */}
      <div className="lg:hidden sticky top-0 z-60">
        <MobileBatchHero
          batch={{
            ...batch,
            isPurchased: batch.isPurchased,
          }}
          isHotDeal={isHotDeal}
          onBack={() => router.push("/student/explore")}
        />
        {/* Mobile Tabs */}
        <MobileBatchTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Main Content - Optimized spacing for mobile */}
      <div className="px-3 py-4 lg:px-10 lg:py-8 bg-background">
        <div className="container max-w-7xl mx-auto">
          {/* Desktop Page Header */}
          <Suspense fallback={<DescriptionPageShimmer />}>
            <BatchDescriptionTab
              batch={batch}
              finalPrice={finalPrice}
              savings={savings}
              isHotDeal={isHotDeal}
            />
          </Suspense>
        </div>
      </div>

      {/* Sticky Bottom CTA (Mobile) - Optimized for thumb reach */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 dark:bg-background/98 backdrop-blur-lg border-t border-border dark:border-gray-800 shadow-2xl safe-area-bottom">
          <div className="container max-w-7xl mx-auto px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="shrink-0">
                {showCoursePricing && (
                  <>
                    <div className="text-xs text-muted-foreground">Total Price</div>
                    <div className="font-bold text-lg sm:text-xl text-primary">
                      {finalPrice === 0 ? 'Free' : formatCurrency(finalPrice, currency)}
                    </div>
                    {savings > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        Save {formatCurrency(savings, currency)}
                      </div>
                    )}
                  </>
                )}
                {!showCoursePricing && (
                  <div className="font-bold text-lg sm:text-xl text-emerald-600 dark:text-emerald-400">
                    {paymentMode === "subscription" ? "Included" : "Free"}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="default"
                  className="shrink-0 h-11 px-4 dark:border-gray-700 dark:hover:bg-gray-800"
                  onClick={() => handleTabChange("description")}
                >
                  Details
                </Button>
                {paymentMode === "per_course" ? (
                  <>
                    <Button
                      variant="outline"
                      size="default"
                      className="shrink-0 h-11 px-4 font-semibold shadow-md"
                      onClick={() => {
                        const addToCartButton = document.querySelector(
                          "[data-add-to-cart-button]"
                        ) as HTMLButtonElement | null;
                        if (addToCartButton && !addToCartButton.disabled) {
                          addToCartButton.click();
                          return;
                        }

                        const actionsSection = document.querySelector(
                          "[data-course-actions]"
                        );
                        if (actionsSection) {
                          actionsSection.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }
                      }}
                    >
                      Cart
                    </Button>
                    <Button
                      size="default"
                      className="shrink-0 h-11 px-6 font-semibold shadow-md"
                      onClick={() => {
                        const buyButton = document.querySelector(
                          "[data-buy-button]"
                        ) as HTMLButtonElement | null;
                        if (buyButton && !buyButton.disabled) {
                          buyButton.click();
                          return;
                        }

                        const actionsSection = document.querySelector(
                          "[data-course-actions]"
                        );
                        if (actionsSection) {
                          actionsSection.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                          });
                        }
                      }}
                    >
                      Buy
                    </Button>
                  </>
                ) : (
                  <Button
                    size="default"
                    className="shrink-0 h-11 px-6 font-semibold shadow-md"
                    onClick={() => {
                      const primaryActionButton = document.querySelector(
                        "[data-primary-course-action]"
                      ) as HTMLButtonElement | null;
                      if (primaryActionButton && !primaryActionButton.disabled) {
                        primaryActionButton.click();
                        return;
                      }

                      const actionsSection = document.querySelector(
                        "[data-course-actions]"
                      );
                      if (actionsSection) {
                        actionsSection.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    }}
                  >
                    Enroll
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
