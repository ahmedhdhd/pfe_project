"use client";

import { Suspense, lazy, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  Filter,
  Search,
  Star,
  X,
} from "@/components/icons";
import { StudentHeader } from "@/components/student/student-header";
import { useGetCategories, useGetExploreBatches } from "@/hooks";
import { ExploreCardsGridShimmer } from "@/components/common/explore-card-shimmer";
import { LottieAnimation } from "@/components/common/lottie-animation";
import { LOTTIE_ANIMATIONS } from "@/lib/constants/lottie-animations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const ExploreBatchCard = lazy(() =>
  import("@/components/student/explore-batch-card").then((mod) => ({
    default: mod.ExploreBatchCard,
  }))
);

interface Batch {
  id: string;
  name: string;
  description?: string | null;
  class?: "11" | "12" | "12+" | "Grad" | string;
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | string;
  exam?: string;
  category?: {
    id: string;
    name: string;
  } | null;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  language: string;
  totalPrice: number;
  discountPercentage: number;
  averageRating?: number;
  ratingCount?: number;
}

export default function ExplorePage() {
  const params = useParams();
  const clientSlug = params.client as string | undefined;
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [minRatingCount, setMinRatingCount] = useState<number | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  const { data: categoriesResponse } = useGetCategories();
  const categories = useMemo(() => {
    const raw = categoriesResponse?.data;
    return Array.isArray(raw) ? raw : [];
  }, [categoriesResponse?.data]);

  const {
    data: batchesResponse,
    isLoading: isBatchesLoading,
    isFetched: isBatchesFetched,
    error: batchesError,
  } = useGetExploreBatches(1, 100, {
    language: selectedLanguage || undefined,
    categoryId: selectedCategoryId || undefined,
    level: selectedLevel || undefined,
    price: priceFilter === "all" ? undefined : priceFilter,
    minRating: minRating ?? undefined,
    minRatingCount: minRatingCount ?? undefined,
  }, clientSlug);

  const batches: Batch[] = Array.isArray(batchesResponse?.data)
    ? batchesResponse.data
    : [];

  const filteredBatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((batch) => {
      const categoryName = batch.category?.name || "";
      const level = String(batch.level || "");
      const language = String(batch.language || "");

      return (
        batch.name.toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q) ||
        level.toLowerCase().includes(q) ||
        language.toLowerCase().includes(q)
      );
    });
  }, [batches, query]);

  const languageOptions = useMemo(() => {
    const base = ["Arabic", "English", "French"];
    const set = new Set<string>();
    for (const lang of base) set.add(lang);
    for (const batch of batches) {
      if (batch.language) set.add(batch.language);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [batches]);

  const levelOptions = [
    { value: "BEGINNER", label: "Beginner" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "ADVANCED", label: "Advanced" },
  ];

  const activeFiltersCount =
    (minRating !== null ? 1 : 0) +
    (minRatingCount !== null ? 1 : 0) +
    (selectedLanguage ? 1 : 0) +
    (selectedCategoryId ? 1 : 0) +
    (selectedLevel ? 1 : 0) +
    (priceFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    setMinRating(null);
    setMinRatingCount(null);
    setSelectedLanguage(null);
    setSelectedCategoryId(null);
    setSelectedLevel(null);
    setPriceFilter("all");
  };

  return (
    <>
      <div className="md:hidden min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/40">
          <div className="flex items-center justify-between px-4 h-14">
            <h1 className="text-xl font-bold text-foreground">Explore</h1>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setFiltersOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount ? (
                <Badge className="ml-2 h-5 px-2 py-0 text-[10px]">
                  {activeFiltersCount}
                </Badge>
              ) : null}
            </Button>
          </div>
        </header>

        <div className="px-4 py-6 space-y-4">
          {batchesError ? (
            <MobileEmptyState
              icon={BookOpen}
              title="Couldn’t load courses"
              text="The server didn’t respond. Please refresh or try again in a moment."
            />
          ) : isBatchesLoading && !isBatchesFetched ? (
            <ExploreCardsGridShimmer count={3} />
          ) : filteredBatches.length === 0 ? (
            <MobileEmptyState
              icon={BookOpen}
              title="No courses available"
              text="Check back later for new courses"
            />
          ) : (
            <Suspense fallback={<ExploreCardsGridShimmer count={3} />}>
              {filteredBatches.map((batch, index) => (
                <ExploreBatchCard key={batch.id} {...batch} index={index} />
              ))}
            </Suspense>
          )}
        </div>
      </div>

      <div className="hidden md:block w-full min-h-screen bg-background">
        <StudentHeader />

        <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
          <section className="text-center py-8 rounded-2xl bg-primary/5 border border-primary/10 animate-slide-up">
            <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
              What do you want to learn?
            </h1>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
              Browse courses and learning resources to accelerate your growth.
            </p>
            <div className="max-w-lg mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for courses, subjects, or topics..."
                className="w-full h-12 rounded-xl border border-border bg-background pl-12 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all shadow-sm"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
            <div className="hidden lg:block">
              <FiltersPanel
                title="Filters"
                onClose={undefined}
                onReset={resetFilters}
                activeCount={activeFiltersCount}
                minRating={minRating}
                setMinRating={setMinRating}
                minRatingCount={minRatingCount}
                setMinRatingCount={setMinRatingCount}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
                selectedCategoryId={selectedCategoryId}
                setSelectedCategoryId={setSelectedCategoryId}
                selectedLevel={selectedLevel}
                setSelectedLevel={setSelectedLevel}
                priceFilter={priceFilter}
                setPriceFilter={setPriceFilter}
                categories={categories}
                languageOptions={languageOptions}
                levelOptions={levelOptions}
              />
            </div>

            <div>
              {batchesError ? (
                <DesktopEmptyState
                  icon={BookOpen}
                  title="Couldn’t load courses"
                  text="The server didn’t respond. Please refresh or try again in a moment."
                />
              ) : isBatchesLoading && !isBatchesFetched ? (
                <ExploreCardsGridShimmer count={6} />
              ) : filteredBatches.length === 0 ? (
                <DesktopEmptyState
                  icon={BookOpen}
                  title="No Courses Found"
                  text="Try adjusting your filters."
                />
              ) : (
                <Suspense fallback={<ExploreCardsGridShimmer count={6} />}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                    {filteredBatches.map((batch, index) => (
                      <ExploreBatchCard key={batch.id} {...batch} index={index} />
                    ))}
                  </div>
                </Suspense>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          filtersOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!filtersOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            filtersOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setFiltersOpen(false)}
        />
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-[86vw] max-w-[380px] bg-background border-l shadow-2xl transition-transform",
            filtersOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <FiltersPanel
            title="Filters"
            onClose={() => setFiltersOpen(false)}
            onReset={resetFilters}
            activeCount={activeFiltersCount}
            minRating={minRating}
            setMinRating={setMinRating}
            minRatingCount={minRatingCount}
            setMinRatingCount={setMinRatingCount}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            selectedCategoryId={selectedCategoryId}
            setSelectedCategoryId={setSelectedCategoryId}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            categories={categories}
            languageOptions={languageOptions}
            levelOptions={levelOptions}
          />
        </div>
      </div>
    </>
  );
}

function FiltersPanel(props: {
  title: string;
  onClose?: (() => void) | undefined;
  onReset: () => void;
  activeCount: number;
  minRating: number | null;
  setMinRating: (value: number | null) => void;
  minRatingCount: number | null;
  setMinRatingCount: (value: number | null) => void;
  selectedLanguage: string | null;
  setSelectedLanguage: (value: string | null) => void;
  selectedCategoryId: string | null;
  setSelectedCategoryId: (value: string | null) => void;
  selectedLevel: string | null;
  setSelectedLevel: (value: string | null) => void;
  priceFilter: "all" | "free" | "paid";
  setPriceFilter: (value: "all" | "free" | "paid") => void;
  categories: Array<{ id: string; name: string; parentId?: string | null }>;
  languageOptions: string[];
  levelOptions: Array<{ value: string; label: string }>;
}) {
  const {
    title,
    onClose,
    onReset,
    activeCount,
    minRating,
    setMinRating,
    minRatingCount,
    setMinRatingCount,
    selectedLanguage,
    setSelectedLanguage,
    selectedCategoryId,
    setSelectedCategoryId,
    selectedLevel,
    setSelectedLevel,
    priceFilter,
    setPriceFilter,
    categories,
    languageOptions,
    levelOptions,
  } = props;

  const rootCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => c.parentId);

  const ratingOptions = [
    { value: 4.5, label: "4.5 & up" },
    { value: 4.0, label: "4.0 & up" },
    { value: 3.0, label: "3.0 & up" },
  ];

  const ratingCountOptions = [
    { value: 10, label: "10+ ratings" },
    { value: 50, label: "50+ ratings" },
    { value: 200, label: "200+ ratings" },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">
            {activeCount ? `${activeCount} active` : "No filters applied"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount ? (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          ) : null}
          {onClose ? (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Rating
            </div>
            <div className="space-y-2">
              {ratingOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    minRating === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/40"
                  )}
                  onClick={() =>
                    setMinRating(minRating === option.value ? null : option.value)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span>{option.label}</span>
                    </div>
                    {minRating === option.value ? (
                      <Badge variant="secondary">Selected</Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ratings Count
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ratingCountOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    minRatingCount === option.value
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted/40"
                  )}
                  onClick={() =>
                    setMinRatingCount(
                      minRatingCount === option.value ? null : option.value
                    )
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Price
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["all", "free", "paid"] as const).map((option) => (
                <button
                  key={option}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    priceFilter === option
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted/40"
                  )}
                  onClick={() => setPriceFilter(option)}
                >
                  {option === "all"
                    ? "All"
                    : option === "free"
                    ? "Free"
                    : "Paid"}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Level
            </div>
            <div className="grid gap-2">
              {levelOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition",
                    selectedLevel === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/40"
                  )}
                  onClick={() =>
                    setSelectedLevel(
                      selectedLevel === option.value ? null : option.value
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {selectedLevel === option.value ? (
                      <Badge variant="secondary">Selected</Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Language
            </div>
            <div className="flex flex-wrap gap-2">
              {languageOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No languages available yet.
                </div>
              ) : (
                languageOptions.map((language) => (
                  <button
                    key={language}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition",
                      selectedLanguage === language
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40"
                    )}
                    onClick={() =>
                      setSelectedLanguage(
                        selectedLanguage === language ? null : language
                      )
                    }
                  >
                    {language}
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </div>
            <div className="space-y-2">
              {rootCategories.map((category) => {
                const isSelected = selectedCategoryId === category.id;
                const children = childCategories.filter(
                  (child) => child.parentId === category.id
                );

                return (
                  <div key={category.id} className="rounded-xl border border-border/60">
                    <button
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                      )}
                      onClick={() =>
                        setSelectedCategoryId(isSelected ? null : category.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(isSelected && "font-medium")}>
                          {category.name}
                        </span>
                        {isSelected ? <Badge variant="secondary">Selected</Badge> : null}
                      </div>
                    </button>
                    {children.length > 0 ? (
                      <div className="border-t border-border/60 p-2 flex flex-wrap gap-2">
                        {children.map((child) => {
                          const childSelected = selectedCategoryId === child.id;
                          return (
                            <button
                              key={child.id}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs transition",
                                childSelected
                                  ? "border-primary bg-primary/5 text-foreground"
                                  : "border-border/60 text-muted-foreground hover:bg-muted/40"
                              )}
                              onClick={() =>
                                setSelectedCategoryId(
                                  childSelected ? null : child.id
                                )
                              }
                            >
                              {child.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}

function MobileEmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BookOpen;
  title: string;
  text: string;
}) {
  return (
    <div className="text-center py-12">
      {LOTTIE_ANIMATIONS.emptyState ? (
        <div className="w-56 h-56 mx-auto mb-6">
          <LottieAnimation
            animationUrl={LOTTIE_ANIMATIONS.emptyState}
            loop={true}
            autoplay={true}
            fallbackIcon={
              <Icon className="h-20 w-20 text-muted-foreground/50" />
            }
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-20 w-20 rounded-2xl bg-primary/5 text-primary/30 mx-auto mb-6">
          <Icon className="h-10 w-10" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function DesktopEmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof BookOpen;
  title: string;
  text: string;
}) {
  return (
    <div className="text-center py-20">
      {LOTTIE_ANIMATIONS.emptyState ? (
        <div className="w-72 h-72 mx-auto mb-6">
          <LottieAnimation
            animationUrl={LOTTIE_ANIMATIONS.emptyState}
            loop={true}
            autoplay={true}
            fallbackIcon={
              <Icon className="h-32 w-32 text-muted-foreground/50" />
            }
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 w-24 rounded-2xl bg-primary/5 text-primary/30 mx-auto mb-6">
          <Icon className="h-12 w-12" />
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
