"use client";

import { motion } from "framer-motion";
import { FAQDisplay } from "@/components/common/faq-display";
import type { ClientHomepageData } from "../types";
import type { Client } from "@/lib/types/client";

interface ClientFAQSectionProps {
  homepage: ClientHomepageData;
  client: Client;
}

export function ClientFAQSection({ homepage, client }: ClientFAQSectionProps) {
  if (!homepage.faq.length) return null;

  const topQuestions = homepage?.faq?.slice(0, 2) || [];

  return (
    <section className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-border to-transparent" />
      <motion.div
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -left-[20%] top-[20%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6 text-left sticky top-24"
            >
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                Help &amp; Support
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                Have questions? <br />
                <span className="text-muted-foreground">
                  We&apos;ve got answers.
                </span>
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Find quick answers to the most common questions about{" "}
                <span className="font-semibold text-foreground">
                  {client.name}
                </span>
                . Still need help? Reach us anytime at{" "}
                <a
                  href={`mailto:${
                    homepage.supportEmail || homepage.contactEmail
                  }`}
                  className="font-semibold text-primary hover:underline"
                >
                  {homepage.supportEmail || homepage.contactEmail}
                </a>
                .
              </p>

              {topQuestions.length > 0 && (
                <div className="mt-8 p-6 bg-background/50 backdrop-blur-sm rounded-2xl border border-border/50">
                  <p className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">
                    Popular questions
                  </p>
                  <ul className="space-y-3 text-sm text-foreground">
                    {topQuestions.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start gap-3 group cursor-default"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary group-hover:scale-150 transition-transform" />
                        <span className="group-hover:text-primary transition-colors">
                          {item.question}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-background/60 backdrop-blur-md border border-border/60 rounded-2xl p-1 shadow-lg shadow-primary/5"
            >
              <div className="bg-background/40 rounded-xl p-4 sm:p-6">
                <FAQDisplay
                  faqs={homepage.faq.map((item) => ({
                    id: String(item.id),
                    question: item.question,
                    answer: item.answer,
                  }))}
                  showCard={false}
                  accordionClassName="w-full"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
