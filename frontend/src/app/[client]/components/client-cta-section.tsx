"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ClientHomepageData } from "../types";
import type { Client } from "@/lib/types/client";

interface ClientCTASectionProps {
  homepage: ClientHomepageData;
  client: Client;
}

export function ClientCTASection({ homepage, client }: ClientCTASectionProps) {
  return (
    <section className="py-32 relative overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-linear-to-br from-primary/90 via-primary to-primary/70 dark:from-primary/20 dark:via-primary/10 dark:to-background"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        style={{ backgroundSize: "200% 200%" }}
      />

      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />

      <div className="px-4 relative z-10">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="backdrop-blur-xl bg-background/10 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white dark:text-foreground tracking-tight drop-shadow-sm">
              Ready to start learning?
            </h2>
            <p className="text-lg md:text-xl text-white/90 dark:text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Join thousands of learners who have already started their journey
              with{" "}
              <span className="font-semibold text-white dark:text-foreground">
                {client.name}
              </span>
              . Get access to world-class content today.
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="inline-block"
            >
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full bg-white text-primary hover:bg-white/90 dark:bg-primary dark:text-primary-foreground shadow-xl shadow-black/10 border-0"
                asChild
              >
                <Link href={homepage.ctaUrl}>
                  {homepage.ctaText}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
