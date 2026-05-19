"use client";

import { useEffect, useState, useMemo } from "react";
import { formatRemaining } from "@/lib/utils/test-engine";

// Drives the countdown timer from a start time and duration
export function useAttemptTimer(
  startedAtMs: number | null | undefined,
  durationMinutes: number,
  tick: () => void
) {
  // Force re-render every second to update the timer
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAtMs || durationMinutes <= 0) {
      console.warn("[TIMER] Timer not started:", {
        startedAtMs,
        durationMinutes,
        reason: !startedAtMs ? "No start time" : "Invalid duration",
      });
      return;
    }

    console.log("[TIMER] Starting countdown:", {
      startedAt: new Date(startedAtMs).toISOString(),
      durationMinutes,
      totalMs: durationMinutes * 60_000,
    });

    const interval = setInterval(() => {
      setNow(Date.now());
      tick();
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAtMs, durationMinutes, tick]);

  const remainingMs = useMemo(() => {
    if (!startedAtMs || durationMinutes <= 0) {
      return 0;
    }
    const elapsed = now - startedAtMs;
    const totalMs = durationMinutes * 60_000;
    const remaining = Math.max(0, totalMs - elapsed);
    return remaining;
  }, [startedAtMs, durationMinutes, now]);

  const { minutes, seconds } = useMemo(
    () => formatRemaining(remainingMs),
    [remainingMs]
  );

  return { remainingMs, minutes, seconds } as const;
}
