"use client";

import { useCallback, useMemo, useState } from "react";

type AttemptState = {
  active: boolean;
  startedAtMs?: number;
  durationMinutes: number;
  totalQuestions: number;
  answers: Record<string, unknown>;
  submittedAtMs?: number;
};

function loadFromStorage(key: string): AttemptState | null {
  try {
    const s = localStorage.getItem(key);
    if (!s) return null;
    return JSON.parse(s) as AttemptState;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: AttemptState) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function useAttemptState(testId: string) {
  const storageKey = `attempt:${testId}`;
  const [state, setState] = useState<AttemptState>(() => {
    return (
      loadFromStorage(storageKey) ?? {
        active: false,
        durationMinutes: 0,
        totalQuestions: 0,
        answers: {},
      }
    );
  });

  const persist = useCallback(
    (updater: (prev: AttemptState) => AttemptState) => {
      setState((prev) => {
        const next = updater(prev);
        saveToStorage(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const actions = useMemo(() => {
    return {
      startAttempt(payload: { durationMinutes: number; totalQuestions: number }) {
        persist((prev) => {
          if (prev.active) return prev;
          return {
            active: true,
            startedAtMs: Date.now(),
            durationMinutes: payload.durationMinutes,
            totalQuestions: payload.totalQuestions,
            answers: {},
          };
        });
      },
      saveAnswer(questionId: string, answer: unknown) {
        persist((prev) => ({ ...prev, answers: { ...prev.answers, [questionId]: answer } }));
      },
      submitAttempt() {
        persist((prev) => ({ ...prev, active: false, submittedAtMs: Date.now() }));
      },
      touch() {
        // no-op state bump through persist
        persist((prev) => ({ ...prev }));
      },
      reset() {
        persist(() => ({ active: false, durationMinutes: 0, totalQuestions: 0, answers: {} }));
      },
    };
  }, [persist]);

  return { state, actions } as const;
}


