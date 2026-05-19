import { useState, useEffect } from "react";

/**
 * Custom hook to detect if the user is on a mobile device
 * Returns null during SSR/initial render to prevent hydration issues
 *
 * @param breakpoint - The breakpoint to check (default: 768px for md screens)
 * @returns Object with isMobile and isClient states
 *
 * @example
 * ```tsx
 * const { isMobile, isClient } = useIsMobile();
 *
 * if (!isClient) {
 *   return null; // Prevent hydration mismatch
 * }
 *
 * return isMobile ? <MobileView /> : <DesktopView />;
 * ```
 */
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return { isMobile, isClient };
}
