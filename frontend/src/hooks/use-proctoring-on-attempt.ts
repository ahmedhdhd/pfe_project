"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { isAttemptRoute } from "@/lib/utils/test-engine";

// Helper to safely handle Promise or synchronous return values
function handleAsync<T>(
  result: T | Promise<T>,
  onError?: (error: unknown) => void
): void {
  if (result instanceof Promise) {
    result.catch((err) => {
      onError?.(err);
    });
  }
}

// Starts camera when entering attempt route and stops when leaving
export function useProctoringOnAttempt(
  enterFullscreen: () => Promise<boolean> | boolean,
  startMedia: () => Promise<boolean> | boolean,
  stopMedia: () => void,
  exitFullscreen: () => Promise<void> | void
) {
  const pathname = usePathname();
  const isOnAttemptRoute = isAttemptRoute(pathname);
  const wasOnAttemptRoute = useRef(false);
  const hasStartedCamera = useRef(false);

  useEffect(() => {
    console.log("[PROCTORING ROUTE DEBUG] Route check:", {
      pathname,
      isAttemptRoute: isOnAttemptRoute,
      wasOnAttemptRoute: wasOnAttemptRoute.current,
      hasStartedCamera: hasStartedCamera.current,
    });

    // Entering attempt route - start camera (only once)
    if (isOnAttemptRoute && !wasOnAttemptRoute.current) {
      console.log(
        "[PROCTORING ROUTE DEBUG] ✅ Entered attempt route - starting camera"
      );
      wasOnAttemptRoute.current = true;

      // Start camera with small delay to avoid conflicts
      if (!hasStartedCamera.current) {
        hasStartedCamera.current = true;
        const timer = setTimeout(() => {
          console.log("[PROCTORING ROUTE DEBUG] Executing camera start...");
          const mediaResult = startMedia();
          handleAsync(mediaResult, (err) => {
            console.error(
              "[PROCTORING ROUTE DEBUG] Failed to start camera:",
              err
            );
            hasStartedCamera.current = false;
          });
        }, 200);

        return () => clearTimeout(timer);
      }
    }

    // Leaving attempt route - stop camera
    if (!isOnAttemptRoute && wasOnAttemptRoute.current) {
      console.log(
        "[PROCTORING ROUTE DEBUG] ❌ Left attempt route - stopping camera"
      );
      wasOnAttemptRoute.current = false;
      hasStartedCamera.current = false;

      // Stop camera and exit fullscreen
      stopMedia();
      const exitResult = exitFullscreen();
      handleAsync(exitResult, () => {
        // Silently fail if not in fullscreen
      });
    }

    // Cleanup on unmount - only cleanup if we're actually leaving the route
    // Don't cleanup on component remount while still on attempt route
    return () => {
      // This cleanup should only run when component unmounts AND we're no longer on attempt route
      // The "leaving route" logic above handles normal navigation cleanup
      // This is just for safety in case component unmounts unexpectedly
    };
  }, [pathname, isOnAttemptRoute, startMedia, stopMedia, exitFullscreen]);
}
