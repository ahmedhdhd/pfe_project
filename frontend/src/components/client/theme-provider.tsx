"use client";

import { useEffect } from "react";
import {
  useOrganizationConfigStore,
  useOrgColors,
} from "@/lib/store/organization-config";
import { hexToOKLCHString } from "@/lib/utils/color-converter";

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

export function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  const colors = useOrgColors();
  const config = useOrganizationConfigStore((state) => state.config);
  const approvedCustomCss = config?.customCSS?.trim() || "";

  // Apply theme colors to CSS variables.
  // SKIP if customCSS is present — customCSS already defines all variables
  // in oklch format. Overriding with setProperty() would fight the AI theme
  // because inline styles have higher specificity than <style> tags.
  useEffect(() => {
    if (!colors.primary || !colors.secondary) return;
    if (approvedCustomCss) return;
    if (config?.customCSS) return; // AI theme owns the variables — do not override
    try {
      const primaryOKLCH = hexToOKLCHString(colors.primary);
      const secondaryOKLCH = hexToOKLCHString(colors.secondary);
      const root = document.documentElement;
      root.style.setProperty("--primary", primaryOKLCH);
      root.style.setProperty("--primary-foreground", "oklch(0.985 0 0)");
      root.style.setProperty("--secondary", secondaryOKLCH);
      root.style.setProperty("--secondary-foreground", "oklch(0.985 0 0)");
      root.style.setProperty("--accent", secondaryOKLCH);
      root.style.setProperty("--accent-foreground", "oklch(0.985 0 0)");
      if (colors.fontFamily) {
        // Tailwind v4 token is --font-sans, NOT --font-family
        root.style.setProperty("--font-sans", colors.fontFamily);
        document.body.style.fontFamily = colors.fontFamily;
      }
    } catch (error) {
      console.error("Failed to apply theme colors:", error);
    }
  }, [colors.primary, colors.secondary, colors.fontFamily, approvedCustomCss]);

  // Inject only policy-approved theme CSS.
  // The backend strips non-theme selectors and clamps sensitive variables
  // before this string is ever persisted in organization config.
  useEffect(() => {
    const styleId = "custom-org-css";
    if (!approvedCustomCss) {
      // Remove the style tag if customCSS was cleared
      document.getElementById(styleId)?.remove();
      // Also clear any inline style overrides from previous non-AI theme
      const root = document.documentElement;
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--secondary-foreground");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-foreground");
      return;
    }
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      // Append at the END of <head> so it comes after globals.css
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = approvedCustomCss;
    // Force-clear any inline style.setProperty overrides so the <style> tag wins
    const root = document.documentElement;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--secondary");
    root.style.removeProperty("--secondary-foreground");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-foreground");
    root.style.removeProperty("--background");
    root.style.removeProperty("--foreground");
    root.style.removeProperty("--card");
    root.style.removeProperty("--card-foreground");
    root.style.removeProperty("--border");
    root.style.removeProperty("--input");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--sidebar");
    root.style.removeProperty("--font-sans");
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [approvedCustomCss]);

  // Apply custom JavaScript if provided (with caution)
  useEffect(() => {
    if (config?.customJS) {
      const scriptId = "custom-org-js";
      let scriptElement = document.getElementById(
        scriptId
      ) as HTMLScriptElement;

      if (!scriptElement) {
        scriptElement = document.createElement("script");
        scriptElement.id = scriptId;
        scriptElement.type = "text/javascript";
        document.body.appendChild(scriptElement);
      }

      scriptElement.textContent = config.customJS;
    }

    return () => {
      const scriptElement = document.getElementById("custom-org-js");
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [config?.customJS]);

  // Apply favicon if provided
  useEffect(() => {
    if (config?.faviconUrl) {
      const link =
        (document.querySelector("link[rel*='icon']") as HTMLLinkElement) ||
        document.createElement("link");
      link.type = "image/x-icon";
      link.rel = "shortcut icon";
      link.href = config.faviconUrl;
      if (!document.querySelector("link[rel*='icon']")) {
        document.head.appendChild(link);
      }
    }
  }, [config?.faviconUrl]);

  // Apply meta tags
  useEffect(() => {
    if (config?.metaTitle) {
      document.title = config.metaTitle;
    }

    if (config?.metaDescription) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", config.metaDescription);
    }

    if (config?.ogImage) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (!ogImage) {
        ogImage = document.createElement("meta");
        ogImage.setAttribute("property", "og:image");
        document.head.appendChild(ogImage);
      }
      ogImage.setAttribute("content", config.ogImage);
    }
  }, [config?.metaTitle, config?.metaDescription, config?.ogImage]);

  return <>{children}</>;
}
