/**
 * Organization Configuration Cache
 *
 * Implements stale-while-revalidate caching strategy for org config.
 * Perfect for static builds - no server required!
 */

import type { OrganizationConfig } from "@/lib/types/api";

const CONFIG_CACHE_KEY = "quezt_org_config";
const CONFIG_CACHE_TIMESTAMP = "quezt_org_config_ts";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_DURATION = 10 * 60 * 1000; // 10 minutes (stale but usable)

/**
 * Get cached config for a subdomain
 */
export function getCachedConfig(subdomain: string): OrganizationConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const cacheKey = `${CONFIG_CACHE_KEY}_${subdomain}`;
    const timestampKey = `${CONFIG_CACHE_TIMESTAMP}_${subdomain}`;

    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(timestampKey);

    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);

      // Fresh cache (< 5 min)
      if (age < CACHE_DURATION) {
        return JSON.parse(cached);
      }

      // Stale but usable (5-10 min) - return it and revalidate in background
      if (age < STALE_DURATION) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.error("[Config Cache] Read error:", error);
  }

  return null;
}

/**
 * Set config in cache
 */
export function setCachedConfig(
  subdomain: string,
  config: OrganizationConfig
): void {
  if (typeof window === "undefined") return;

  try {
    const cacheKey = `${CONFIG_CACHE_KEY}_${subdomain}`;
    const timestampKey = `${CONFIG_CACHE_TIMESTAMP}_${subdomain}`;

    localStorage.setItem(cacheKey, JSON.stringify(config));
    localStorage.setItem(timestampKey, Date.now().toString());
  } catch (error) {
    console.error("[Config Cache] Write error:", error);
  }
}

/**
 * Check if cached config needs revalidation
 */
export function needsRevalidation(subdomain: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    const timestampKey = `${CONFIG_CACHE_TIMESTAMP}_${subdomain}`;
    const timestamp = localStorage.getItem(timestampKey);

    if (!timestamp) return true;

    const age = Date.now() - parseInt(timestamp, 10);
    return age >= CACHE_DURATION; // Older than 5 minutes
  } catch (error) {
    return true;
  }
}

/**
 * Get config with stale-while-revalidate strategy
 * Returns cached config immediately if available, fetches fresh in background
 */
export async function getConfigWithCache(
  subdomain: string,
  apiUrl: string
): Promise<{ config: OrganizationConfig; fromCache: boolean }> {
  // Try cache first
  const cached = getCachedConfig(subdomain);

  if (cached) {
    // Return cached immediately (instant UX!)
    const result = { config: cached, fromCache: true };

    // Revalidate in background if needed
    if (needsRevalidation(subdomain)) {
      // Fire and forget - don't await
      fetchAndCacheConfig(subdomain, apiUrl).catch((error) => {
        console.error("[Config Cache] Background revalidation failed:", error);
      });
    }

    return result;
  }

  // No cache - fetch fresh (only happens on first visit)
  const config = await fetchAndCacheConfig(subdomain, apiUrl);
  return { config, fromCache: false };
}

/**
 * Fetch config from API and cache it
 */
async function fetchAndCacheConfig(
  subdomain: string,
  apiUrl: string
): Promise<OrganizationConfig> {
  try {
    const response = await fetch(
      `${apiUrl}api/organization-config/${subdomain}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      let errorMessage = response.statusText || `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If response is not JSON, use statusText
      }

      const error = new Error(
        `Failed to fetch config: ${errorMessage} (Status: ${response.status})`
      );
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const config = await response.json();

    // Validate config structure
    if (!config || typeof config !== "object") {
      throw new Error("Invalid config response: expected an object");
    }

    // Cache it
    setCachedConfig(subdomain, config);

    return config;
  } catch (error) {
    // Re-throw with more context if it's not already our error
    if (error instanceof Error) {
      // Check if it's a network error
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError") ||
        error.message.includes("network")
      ) {
        throw new Error(
          `Network error while fetching config. Please check your connection.`
        );
      }
      throw error;
    }
    throw new Error(`Unknown error while fetching config: ${String(error)}`);
  }
}

/**
 * Clear config cache (useful for logout or forced refresh)
 */
export function clearConfigCache(subdomain?: string): void {
  if (typeof window === "undefined") return;

  try {
    if (subdomain) {
      localStorage.removeItem(`${CONFIG_CACHE_KEY}_${subdomain}`);
      localStorage.removeItem(`${CONFIG_CACHE_TIMESTAMP}_${subdomain}`);
    } else {
      // Clear all org configs
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith(CONFIG_CACHE_KEY) ||
          key.startsWith(CONFIG_CACHE_TIMESTAMP)
        ) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error("[Config Cache] Clear error:", error);
  }
}

/**
 * Preload config (useful for prefetching on hover/focus)
 */
export function preloadConfig(subdomain: string, apiUrl: string): void {
  // Check if already cached and fresh
  if (!needsRevalidation(subdomain)) {
    return; // Already fresh, no need to preload
  }

  // Fetch in background
  fetchAndCacheConfig(subdomain, apiUrl).catch((error) => {
    console.error("[Config Cache] Preload failed:", error);
  });
}
