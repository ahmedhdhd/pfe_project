export function isAttemptRoute(pathname: string): boolean {
  return /\/student\/tests\/[^/]+\/attempt(\/?|$)/.test(pathname);
}

export function formatRemaining(ms: number): {
  minutes: number;
  seconds: number;
} {
  const clamped = Math.max(0, ms);
  const minutes = Math.floor(clamped / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  return { minutes, seconds };
}

export function getAnsweredCount(answers: Record<string, unknown>): number {
  return Object.keys(answers).filter((k) => {
    const v = answers[k];
    return v !== undefined && v !== null && v !== "";
  }).length;
}
