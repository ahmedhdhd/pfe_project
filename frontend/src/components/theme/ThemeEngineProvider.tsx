"use client";

import { useEffect, useMemo } from "react";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import { hexToOKLCHString } from "@/lib/utils/color-converter";
import {
  applyThemeToDocument,
  clearThemeDataAttributes,
  resolveTheme,
} from "@/lib/theme/apply-theme";
import { legacyConfigToUiConfig } from "@/lib/theme/legacy-adapter";
import { isEmbedPreviewMode } from "@/lib/platform-preview";

interface ThemeEngineProviderProps {
  children: React.ReactNode;
}

export function ThemeEngineProvider({ children }: ThemeEngineProviderProps) {
  const config = useOrganizationConfigStore((state) => state.config);

  const uiConfig = useMemo(
    () => legacyConfigToUiConfig(config),
    [config]
  );

  const resolved = useMemo(() => resolveTheme(uiConfig), [uiConfig]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    // Full custom CSS should own the runtime theme tokens. Inline vars from the
    // theme engine would override it otherwise.
    if (config?.customCSS) {
      const root = document.documentElement;
      const body = document.body;

      clearThemeDataAttributes();
      [
        "--radius",
        "--font-sans",
        "--ui-shadow",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--accent",
        "--accent-foreground",
        "--ring",
        "--sidebar-primary",
        "--font-family",
      ].forEach((key) => root.style.removeProperty(key));
      body?.style.removeProperty("font-family");
      return;
    }

    applyThemeToDocument(resolved);
  }, [resolved, config?.customCSS]);

  useEffect(() => {
    const embedPreview =
      typeof window !== "undefined" && isEmbedPreviewMode();
    if (embedPreview) {
      document.documentElement.setAttribute("data-embed-preview", "true");
      return () => {
        document.documentElement.removeAttribute("data-embed-preview");
      };
    }
  }, []);

  useEffect(() => {
    if (config?.customCSS) {
      return;
    }

    const primary =
      resolved.uiConfig.tokens?.primaryColor ||
      config?.theme?.primaryColor ||
      "#3b82f6";
    const secondary =
      resolved.uiConfig.tokens?.secondaryColor ||
      config?.theme?.secondaryColor ||
      "#06b6d4";

    try {
      const root = document.documentElement;
      root.style.setProperty("--primary", hexToOKLCHString(primary));
      root.style.setProperty("--primary-foreground", "oklch(0.98 0.02 260)");
      root.style.setProperty("--secondary", hexToOKLCHString(secondary));
      root.style.setProperty(
        "--secondary-foreground",
        "oklch(0.98 0.02 260)"
      );
      root.style.setProperty("--accent", hexToOKLCHString(secondary));
      root.style.setProperty("--accent-foreground", "oklch(0.98 0.02 260)");
      root.style.setProperty("--ring", hexToOKLCHString(primary));
      root.style.setProperty("--sidebar-primary", hexToOKLCHString(primary));

      const font =
        resolved.cssVars["--font-sans"] || config?.theme?.fontFamily;
      if (font) {
        root.style.setProperty("--font-family", font);
        document.body.style.fontFamily = font;
      }
    } catch (error) {
      console.error("Failed to apply brand colors:", error);
    }
  }, [resolved, config?.theme, config?.customCSS]);

  return <>{children}</>;
}
