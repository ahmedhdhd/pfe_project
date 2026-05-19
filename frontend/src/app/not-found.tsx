"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function NotFound() {
  const router = useRouter();
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    // Load a popular 404 animation from LottieFiles CDN
    const loadAnimation = async () => {
      try {
        // Using a free, popular 404 animation from LottieFiles
        const response = await fetch(
          "https://assets5.lottiefiles.com/packages/lf20_ghfpce1h.json"
        );
        if (response.ok) {
          const data = await response.json();
          setAnimationData(data);
        } else {
          // Fallback: try another popular 404 animation
          const fallbackResponse = await fetch(
            "https://assets5.lottiefiles.com/packages/lf20_kcsr6tcp.json"
          );
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            setAnimationData(fallbackData);
          }
        }
      } catch (error) {
        console.error("Failed to load Lottie animation:", error);
        // If both fail, we'll show a static 404 with animation
        setAnimationData(null);
      }
    };

    loadAnimation();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Decorative gradient background elements - using both primary and secondary */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl animate-pulse [animation-delay:0.5s]" />
      </div>

      <div className="max-w-2xl w-full text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Lottie Animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="w-full max-w-md h-80 md:h-96 relative">
              {/* Decorative ring around animation - gradient from primary to secondary */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-secondary/20 animate-pulse [animation-delay:0.5s]" />
              {animationData ? (
                <Lottie
                  animationData={animationData}
                  loop={true}
                  autoplay={true}
                  className="w-full h-full"
                />
              ) : (
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div className="text-9xl font-bold bg-gradient-to-br from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
                    404
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Error Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-br from-primary via-primary/90 to-secondary bg-clip-text text-transparent">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
              Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Oops! The page you&apos;re looking for seems to have wandered off.
              Don&apos;t worry, let&apos;s get you back on track.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              onClick={() => router.push("/")}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/20"
            >
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
