/**
 * Storage utilities for localStorage, sessionStorage, and cookies
 */

import React from "react";

export type StorageType = "localStorage" | "sessionStorage";

/**
 * Safe storage operations with error handling
 */
export const createStorage = (type: StorageType) => {
  const getStorage = () => {
    if (typeof window === "undefined") return null;
    return type === "localStorage"
      ? window.localStorage
      : window.sessionStorage;
  };

  return {
    get: <T>(key: string, defaultValue?: T): T | null => {
      try {
        const storage = getStorage();
        if (!storage) return defaultValue ?? null;

        const item = storage.getItem(key);
        if (item === null) return defaultValue ?? null;
        return JSON.parse(item);
      } catch (error) {
        console.error(`Error reading from ${type}:`, error);
        return defaultValue ?? null;
      }
    },

    set: <T>(key: string, value: T): boolean => {
      try {
        const storage = getStorage();
        if (!storage) return false;

        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Error writing to ${type}:`, error);
        return false;
      }
    },

    remove: (key: string): boolean => {
      try {
        const storage = getStorage();
        if (!storage) return false;

        storage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Error removing from ${type}:`, error);
        return false;
      }
    },

    clear: (): boolean => {
      try {
        const storage = getStorage();
        if (!storage) return false;

        storage.clear();
        return true;
      } catch (error) {
        console.error(`Error clearing ${type}:`, error);
        return false;
      }
    },

    exists: (key: string): boolean => {
      const storage = getStorage();
      if (!storage) return false;
      return storage.getItem(key) !== null;
    },

    keys: (): string[] => {
      try {
        const storage = getStorage();
        if (!storage) return [];
        return Object.keys(storage);
      } catch (error) {
        console.error(`Error getting keys from ${type}:`, error);
        return [];
      }
    },
  };
};

export const localStorage = createStorage("localStorage");
export const sessionStorage = createStorage("sessionStorage");

/**
 * Hook for localStorage with React state synchronization
 */
export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      const item = localStorage.get<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = React.useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        localStorage.set(key, valueToStore);
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = React.useCallback(() => {
    try {
      setStoredValue(initialValue);
      localStorage.remove(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};

/**
 * Hook for sessionStorage with React state synchronization
 */
export const useSessionStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      const item = sessionStorage.get<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = React.useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        sessionStorage.set(key, valueToStore);
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = React.useCallback(() => {
    try {
      setStoredValue(initialValue);
      sessionStorage.remove(key);
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
};

/**
 * Cookie utilities with safe operations
 */
export interface CookieOptions {
  path?: string;
  expires?: Date | number; // Date object or days from now
  domain?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export const cookieStorage = {
  /**
   * Get a cookie value by name
   * Automatically parses JSON if the value is a valid JSON string
   */
  get: <T = string>(name: string): T | string | null => {
    if (typeof window === "undefined") return null;

    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(";").shift();
        if (!cookieValue) return null;

        const decodedValue = decodeURIComponent(cookieValue);

        // Try to parse as JSON if it looks like JSON
        try {
          return JSON.parse(decodedValue) as T;
        } catch {
          // If not valid JSON, return as string
          return decodedValue;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error reading cookie "${name}":`, error);
      return null;
    }
  },

  /**
   * Get a cookie value by name as a raw string (no JSON parsing)
   */
  getRaw: (name: string): string | null => {
    if (typeof window === "undefined") return null;

    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(";").shift();
        return cookieValue ? decodeURIComponent(cookieValue) : null;
      }
      return null;
    } catch (error) {
      console.error(`Error reading cookie "${name}":`, error);
      return null;
    }
  },

  /**
   * Set a cookie with options
   */
  set: (name: string, value: string, options: CookieOptions = {}): boolean => {
    if (typeof window === "undefined") return false;

    try {
      let cookie = `${name}=${encodeURIComponent(value)}`;

      // Handle expires option
      if (options.expires) {
        let expiresDate: Date;
        if (typeof options.expires === "number") {
          expiresDate = new Date();
          expiresDate.setTime(
            expiresDate.getTime() + options.expires * 24 * 60 * 60 * 1000
          );
        } else {
          expiresDate = options.expires;
        }
        cookie += `; expires=${expiresDate.toUTCString()}`;
      }

      // Add path (default to root)
      cookie += `; path=${options.path || "/"}`;

      // Add domain if specified
      if (options.domain) {
        cookie += `; domain=${options.domain}`;
      }

      // Add secure flag if specified
      if (options.secure) {
        cookie += "; secure";
      }

      // Add sameSite if specified
      if (options.sameSite) {
        cookie += `; samesite=${options.sameSite}`;
      }

      document.cookie = cookie;
      return true;
    } catch (error) {
      console.error(`Error setting cookie "${name}":`, error);
      return false;
    }
  },

  /**
   * Remove a cookie by name
   */
  remove: (
    name: string,
    options: Pick<CookieOptions, "path" | "domain"> = {}
  ): boolean => {
    if (typeof window === "undefined") return false;

    try {
      // Set expiration to past date to delete
      return cookieStorage.set(name, "", {
        ...options,
        expires: new Date(0),
      });
    } catch (error) {
      console.error(`Error removing cookie "${name}":`, error);
      return false;
    }
  },

  /**
   * Check if a cookie exists
   */
  exists: (name: string): boolean => {
    return cookieStorage.get(name) !== null;
  },

  /**
   * Get all cookies as an object
   */
  getAll: (): Record<string, string> => {
    if (typeof window === "undefined") return {};

    try {
      const cookies: Record<string, string> = {};
      document.cookie.split(";").forEach((cookie) => {
        const [name, ...rest] = cookie.split("=");
        const value = rest.join("=");
        if (name && value) {
          cookies[name.trim()] = decodeURIComponent(value.trim());
        }
      });
      return cookies;
    } catch (error) {
      console.error("Error reading all cookies:", error);
      return {};
    }
  },

  /**
   * Clear all cookies (be careful with this!)
   */
  clear: (): boolean => {
    if (typeof window === "undefined") return false;

    try {
      const cookies = cookieStorage.getAll();
      Object.keys(cookies).forEach((name) => {
        cookieStorage.remove(name);
      });
      return true;
    } catch (error) {
      console.error("Error clearing cookies:", error);
      return false;
    }
  },
};
