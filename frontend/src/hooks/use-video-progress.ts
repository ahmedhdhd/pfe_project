import { useRef, useEffect } from "react";
import { toast } from "sonner";
import type Player from "video.js/dist/types/player";
import {
  useContentProgress,
  useTrackContentProgress,
  useMarkContentComplete,
} from "@/hooks/api";

interface UseVideoProgressOptions {
  contentId: string;
  onComplete?: () => void;
}

export function useVideoProgress({
  contentId,
  onComplete,
}: UseVideoProgressOptions) {
  // Refs for progress tracking
  const hasResumed = useRef<boolean>(false);
  const isTrackingRef = useRef<boolean>(false);
  const lastProgressUpdateRef = useRef<number>(0);
  const lastTrackedTime = useRef<number>(0);

  // Content progress hooks
  const { data: progressData } = useContentProgress(contentId);
  const trackProgress = useTrackContentProgress();
  const markComplete = useMarkContentComplete();

  const isCompleted = progressData?.data?.isCompleted || false;

  // Reset tracking state when content changes
  useEffect(() => {
    hasResumed.current = false;
    lastTrackedTime.current = 0;
    isTrackingRef.current = false;
    lastProgressUpdateRef.current = 0;
  }, [contentId]);

  // Handle manual mark as complete
  const handleMarkAsComplete = () => {
    if (progressData?.data?.isCompleted) {
      toast.info("Content already completed");
      return;
    }

    markComplete.mutate(contentId, {
      onSuccess: () => {
        toast.success("Content marked as completed! 🎉");
        onComplete?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          (error && typeof error === "object" && "response" in error
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message
            : null) ||
          (error && typeof error === "object" && "message" in error
            ? String((error as { message: unknown }).message)
            : null) ||
          "Failed to mark as complete. Please try again.";
        toast.error("Error", {
          description: errorMessage,
        });
      },
    });
  };

  // Track progress with error handling
  const handleTrackProgress = (currentTime: number, totalDuration: number) => {
    // Validate inputs
    if (
      currentTime === null ||
      currentTime === undefined ||
      totalDuration === null ||
      totalDuration === undefined ||
      isNaN(currentTime) ||
      isNaN(totalDuration) ||
      totalDuration <= 0 ||
      currentTime < 0
    ) {
      return;
    }

    // Don't track if already completed
    if (isCompleted) {
      return;
    }

    // Track progress every 10 seconds (as per backend recommendation)
    const now = Date.now();
    if (now - lastProgressUpdateRef.current < 10000) {
      return; // Throttle to max once per 10 seconds
    }

    // Only track if video is actually playing (not paused)
    if (!isTrackingRef.current) {
      return;
    }

    trackProgress.mutate(
      {
        contentId,
        data: {
          watchedSeconds: Math.floor(currentTime),
          totalDuration: Math.floor(totalDuration),
        },
      },
      {
        onError: (error: unknown) => {
          // Don't show error toast for progress tracking failures
          console.error("Progress tracking error:", error);
        },
      }
    );

    lastProgressUpdateRef.current = now;
    lastTrackedTime.current = currentTime;
  };

  // Setup player event handlers
  const setupPlayerHandlers = (player: Player) => {
    // Store handlers for cleanup
    const handlers: {
      loadedmetadata?: () => void;
      play?: () => void;
      pause?: () => void;
      seeked?: () => void;
    } = {};

    // Resume from last watched position
    const resumeTime = progressData?.data?.watchedSeconds || 0;

    if (
      resumeTime > 0 &&
      progressData?.data &&
      !progressData.data.isCompleted &&
      !hasResumed.current
    ) {
      const handleResume = () => {
        if (hasResumed.current) return;

        const totalDuration = player.duration();
        if (
          totalDuration !== null &&
          totalDuration !== undefined &&
          isFinite(totalDuration) &&
          resumeTime < totalDuration &&
          totalDuration > 0
        ) {
          player.currentTime(resumeTime);
          hasResumed.current = true;
          // Clean up the listener after resume
          if (handlers.loadedmetadata) {
            player.off("loadedmetadata", handlers.loadedmetadata);
          }
        }
      };

      handlers.loadedmetadata = handleResume;

      // Try to resume immediately if duration is available
      const duration = player.duration();
      if (duration && isFinite(duration) && duration > 0) {
        handleResume();
      } else {
        // Wait for metadata if duration not available yet
        player.on("loadedmetadata", handlers.loadedmetadata);
      }
    }

    // Track when video starts playing
    handlers.play = () => {
      isTrackingRef.current = true;
      const currentTime = player.currentTime();
      const totalDuration = player.duration();
      if (
        currentTime !== null &&
        currentTime !== undefined &&
        totalDuration !== null &&
        totalDuration !== undefined &&
        isFinite(totalDuration) &&
        totalDuration > 0
      ) {
        handleTrackProgress(currentTime, totalDuration);
      }
    };
    player.on("play", handlers.play);

    // Stop tracking when paused
    handlers.pause = () => {
      isTrackingRef.current = false;
    };
    player.on("pause", handlers.pause);

    // Handle seek events - update progress after seek
    handlers.seeked = () => {
      const currentTime = player.currentTime();
      const totalDuration = player.duration();
      if (
        currentTime !== null &&
        currentTime !== undefined &&
        totalDuration !== null &&
        totalDuration !== undefined &&
        isFinite(totalDuration) &&
        totalDuration > 0 &&
        isTrackingRef.current
      ) {
        lastTrackedTime.current = currentTime;
        handleTrackProgress(currentTime, totalDuration);
      }
    };
    player.on("seeked", handlers.seeked);

    // Return cleanup function
    return () => {
      if (handlers.loadedmetadata) {
        player.off("loadedmetadata", handlers.loadedmetadata);
      }
      if (handlers.play) {
        player.off("play", handlers.play);
      }
      if (handlers.pause) {
        player.off("pause", handlers.pause);
      }
      if (handlers.seeked) {
        player.off("seeked", handlers.seeked);
      }
    };
  };

  // Handle time update
  const handleTimeUpdate = (
    currentTime: number,
    playerInstance: Player | null
  ) => {
    if (!playerInstance || !isTrackingRef.current) return;

    const totalDuration = playerInstance.duration();

    // Validate duration (YouTube videos might return NaN or Infinity)
    if (
      !totalDuration ||
      !isFinite(totalDuration) ||
      totalDuration <= 0 ||
      isNaN(currentTime) ||
      currentTime < 0
    ) {
      return;
    }

    // Track progress (throttled to every 10 seconds)
    handleTrackProgress(currentTime, totalDuration);

    // Auto-complete at 95% (as per backend spec)
    const watchPercentage = (currentTime / totalDuration) * 100;
    if (watchPercentage >= 95 && !isCompleted) {
      markComplete.mutate(contentId, {
        onSuccess: () => {
          toast.success("Content completed automatically! 🎉");
          onComplete?.();
        },
        onError: (error: unknown) => {
          console.error("Auto-complete error:", error);
        },
      });
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    isTrackingRef.current = false;

    if (!isCompleted) {
      markComplete.mutate(contentId, {
        onSuccess: () => {
          toast.success("Content completed! 🎉");
          onComplete?.();
        },
        onError: (error: unknown) => {
          console.error("Mark complete on ended error:", error);
        },
      });
    }
  };

  return {
    isCompleted,
    progressData,
    handleMarkAsComplete,
    setupPlayerHandlers,
    handleTimeUpdate,
    handleVideoEnded,
    isMarkingComplete: markComplete.isPending,
    cleanup: () => {
      // Reset all refs when cleaning up
      hasResumed.current = false;
      isTrackingRef.current = false;
      lastProgressUpdateRef.current = 0;
      lastTrackedTime.current = 0;
    },
  };
}
