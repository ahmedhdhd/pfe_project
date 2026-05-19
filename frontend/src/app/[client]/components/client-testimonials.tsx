"use client";

import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClientHomepageData } from "../types";

interface ClientTestimonialsSectionProps {
  homepage: ClientHomepageData;
}

import { Quote } from "lucide-react";

function TestimonialCard({
  name,
  role,
  content,
}: {
  name: string;
  role: string;
  content: string;
}) {
  return (
    <Card className="h-full border-muted/40 bg-background/60 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 relative overflow-hidden group">
      <div className="absolute top-4 right-4 text-primary/5 group-hover:text-primary/10 transition-colors duration-300">
        <Quote className="h-12 w-12 rotate-180" />
      </div>
      <CardContent className="pt-8 pb-8 flex h-full flex-col justify-between gap-6 relative z-10">
        <CardDescription className="text-base md:text-lg leading-relaxed font-medium text-foreground/80 italic">
          &quot;{content}&quot;
        </CardDescription>

        <div className="flex items-center space-x-4 pt-2 border-t border-border/40 mt-auto">
          <div className="h-12 w-12 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-md text-primary-foreground">
            <span className="text-lg font-bold">{name.charAt(0)}</span>
          </div>
          <div className="text-left">
            <p className="font-semibold text-base text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientTestimonialsSection({
  homepage,
}: ClientTestimonialsSectionProps) {
  const testimonials = homepage.testimonials;
  const useCarousel = testimonials.length > 3;
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  if (!testimonials.length) {
    return null;
  }

  return (
    <section className="pt-16 md:pt-20 pb-24 md:pb-28 px-4">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What learners say about their experience
          </h2>
          <p className="text-lg text-muted-foreground">
            Short, focused programs that actually fit into busy schedules—and
            still feel structured.
          </p>
        </motion.div>

        {!useCarousel && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <TestimonialCard
                  name={testimonial.name}
                  role={testimonial.role}
                  content={testimonial.content}
                />
              </motion.div>
            ))}
          </div>
        )}

        {useCarousel && (
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex gap-6 md:gap-8">
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    className="min-w-0 w-full md:w-1/2 lg:w-1/3 shrink-0 py-1 px-2 md:px-3"
                  >
                    <TestimonialCard
                      name={testimonial.name}
                      role={testimonial.role}
                      content={testimonial.content}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Prev / Next buttons */}
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full border bg-background/90 shadow-sm hover:bg-muted transition"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full border bg-background/90 shadow-sm hover:bg-muted transition"
              aria-label="Next testimonial"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
