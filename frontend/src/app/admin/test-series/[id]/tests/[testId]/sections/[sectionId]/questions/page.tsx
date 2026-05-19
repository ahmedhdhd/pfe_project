"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  useSectionQuestions,
  Question,
  QuestionType,
} from "@/hooks/test-series";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Lightbulb, Search } from "lucide-react";

const ITEM_HEIGHT = 112; // Approx. per-question card height; adjust as needed
const OVERSCAN = 6; // Extra items rendered above/below viewport

function QuestionRow({
  question,
  index,
}: {
  question: Question;
  index: number;
}) {
  return (
    <div className="border-2 border-border rounded-lg p-5 bg-background hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {index + 1}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h4 className="text-base font-semibold leading-relaxed text-foreground mb-2">
                {question.text}
              </h4>
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt="Question"
                  className="max-w-md rounded-lg border-2 border-border shadow-sm"
                />
              )}
            </div>
            <div className="flex items-center flex-wrap gap-2">
              <Badge
                variant="outline"
                className="text-xs font-medium bg-background border-border"
              >
                {question.type}
              </Badge>
              <Badge
                variant="outline"
                className="text-xs font-medium bg-background border-border"
              >
                {question.marks} mark{question.marks !== 1 ? "s" : ""}
              </Badge>
              {question.negativeMarks > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium text-destructive bg-destructive/10 border-destructive/20"
                >
                  -{question.negativeMarks} penalty
                </Badge>
              )}
            </div>
            {question.explanation && (
              <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VirtualizedQuestions({ items }: { items: Question[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => setScrollTop(el.scrollTop);
    const handleResize = () => setViewportHeight(el.clientHeight);
    handleResize();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const totalHeight = items.length * ITEM_HEIGHT;
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN
  );
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + viewportHeight) / ITEM_HEIGHT) + OVERSCAN
  );
  const offsetTop = startIndex * ITEM_HEIGHT;
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto pr-2"
      style={{ willChange: "transform" }}
    >
      <div style={{ height: totalHeight }}>
        <div
          style={{ transform: `translateY(${offsetTop}px)` }}
          className="space-y-4"
        >
          {visibleItems.map((q, i) => (
            <QuestionRow key={q.id} question={q} index={startIndex + i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SectionQuestionsPage() {
  const router = useRouter();
  const params = useParams<{
    id: string;
    testId: string;
    sectionId: string;
  }>();

  const sectionId = params.sectionId as string;
  const testSeriesId = params.id as string;
  const testId = params.testId as string;
  const pathname = usePathname();

  // Determine basePath from current route
  const basePath = pathname?.startsWith("/teacher") ? "teacher" : "admin";
  const { data, isLoading } = useSectionQuestions(sectionId);
  const questions = (data?.data as Question[]) || [];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter((q) => {
      const matchesText = s ? q.text.toLowerCase().includes(s) : true;
      const matchesType =
        typeFilter === "ALL" ? true : q.type === (typeFilter as QuestionType);
      return matchesText && matchesType;
    });
  }, [questions, search, typeFilter]);

  return (
    <div className="flex h-full min-h-[calc(100vh-64px)] flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(
                  `/${basePath}/test-series/${testSeriesId}/tests/${testId}`
                )
              }
              className="h-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="text-xs text-muted-foreground leading-none mb-0.5">
                Section
              </div>
              <div className="text-base font-semibold leading-tight">
                Questions
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="pl-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="ALL">All types</SelectItem>
                <SelectItem value="MCQ">MCQ</SelectItem>
                <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                <SelectItem value="FILL_BLANK">Fill Blank</SelectItem>
                <SelectItem value="NUMERICAL">Numerical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 py-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No questions found.
          </div>
        ) : (
          <VirtualizedQuestions items={filtered} />
        )}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-10 border-t bg-background">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="text-xs text-muted-foreground">
            Showing {filtered.length} of {questions.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Export
            </Button>
            <Button size="sm">Add Question</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
