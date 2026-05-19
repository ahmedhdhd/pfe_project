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

  // Apply theme colors to CSS variables
  useEffect(() => {
    if (!colors.primary || !colors.secondary) return;

    try {
      const primaryOKLCH = hexToOKLCHString(colors.primary);
      const secondaryOKLCH = hexToOKLCHString(colors.secondary);

      const root = document.documentElement;

      // Primary color (buttons, links, etc.)
      root.style.setProperty("--primary", primaryOKLCH);
      root.style.setProperty("--primary-foreground", "oklch(0.98 0.02 260)");

      // Secondary/Accent color
      root.style.setProperty("--secondary", secondaryOKLCH);
      root.style.setProperty("--secondary-foreground", "oklch(0.98 0.02 260)");
      root.style.setProperty("--accent", secondaryOKLCH);
      root.style.setProperty("--accent-foreground", "oklch(0.98 0.02 260)");

      // Font family
      if (colors.fontFamily) {
        root.style.setProperty("--font-family", colors.fontFamily);
        document.body.style.fontFamily = colors.fontFamily;
      }
    } catch (error) {
      console.error("Failed to apply theme colors:", error);
    }
  }, [colors.primary, colors.secondary, colors.fontFamily]);

  // Apply custom CSS if provided
  useEffect(() => {
    if (config?.customCSS) {
      const styleId = "custom-org-css";
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = config.customCSS;
    }

    return () => {
      const styleElement = document.getElementById("custom-org-css");
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [config?.customCSS]);

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
