"use client";

import { HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

/**
 * Flexible FAQ item interface that supports different field names
 */
export interface FAQItem {
  id?: string;
  title?: string;
  question?: string;
  description?: string;
  answer?: string;
}

interface FAQDisplayProps {
  /**
   * Array of FAQ items
   */
  faqs?: FAQItem[];
  /**
   * Title for the FAQ section
   */
  title?: string;
  /**
   * Whether to show the Card wrapper
   */
  showCard?: boolean;
  /**
   * Custom className for the container
   */
  className?: string;
  /**
   * Custom empty state message
   */
  emptyMessage?: string;
  /**
   * Whether to allow HTML content in descriptions/answers
   */
  allowHTML?: boolean;
  /**
   * Custom className for Accordion items
   */
  accordionClassName?: string;
  /**
   * Custom className for question/title
   */
  questionClassName?: string;
  /**
   * Custom className for answer/description
   */
  answerClassName?: string;
}

/**
 * Common FAQ Display Component
 *
 * Displays FAQs in an accordion format. Supports flexible field names:
 * - Uses `title` or `question` for the question
 * - Uses `description` or `answer` for the answer
 *
 * @example
 * ```tsx
 * <FAQDisplay
 *   faqs={[
 *     { title: "What is this?", description: "This is..." },
 *     { question: "How does it work?", answer: "It works by..." }
 *   ]}
 * />
 * ```
 */
export function FAQDisplay({
  faqs = [],
  title = "Frequently Asked Questions",
  showCard = true,
  className,
  emptyMessage = "No frequently asked questions available.",
  allowHTML = true,
  accordionClassName,
  questionClassName,
  answerClassName,
}: FAQDisplayProps) {
  // Normalize FAQs - extract question and answer from flexible field names
  const normalizedFaqs = faqs
    ?.map((faq, index) => {
      const question = faq.title || faq.question || "";
      const answer = faq.description || faq.answer || "";
      const id = faq.id || `faq-${index}`;

      return {
        id,
        question,
        answer,
        original: faq,
      };
    })
    .filter((faq) => faq.question && faq.answer);

  const content = (
    <div className={cn("w-full", className)}>
      {normalizedFaqs?.length > 0 ? (
        <Accordion
          type="single"
          collapsible
          className={cn("w-full", accordionClassName)}
        >
          {normalizedFaqs?.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className={cn("text-left", questionClassName)}>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent
                className={cn(
                  "text-muted-foreground prose prose-sm dark:prose-invert max-w-none",
                  answerClassName
                )}
              >
                {allowHTML && faq.answer ? (
                  <div
                    className="faq-content"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(faq.answer),
                    }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{faq.answer}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-8">
          {emptyMessage}
        </div>
      )}
    </div>
  );

  if (showCard) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
        <style jsx global>{`
          /* Override inline styles in dark mode for FAQ content */
          .dark .faq-content div[style],
          .dark .faq-content p[style],
          .dark .faq-content span[style] {
            background: hsl(var(--background)) !important;
            color: hsl(var(--foreground)) !important;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      {content}
      <style jsx global>{`
        /* Override inline styles in dark mode for FAQ content */
        .dark .faq-content div[style],
        .dark .faq-content p[style],
        .dark .faq-content span[style] {
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
        }
      `}</style>
    </>
  );
}
