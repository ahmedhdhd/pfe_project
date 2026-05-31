"use client";

import { useEffect } from "react";
import { useOrganizationConfigStore } from "@/lib/store/organization-config";
import { isEmbedPreviewMode } from "@/lib/platform-preview";

interface ClientThemeProviderProps {
  children: React.ReactNode;
}

/** Meta tags, favicon, optional custom CSS — colors handled by ThemeEngineProvider. */
export function ClientThemeProvider({ children }: ClientThemeProviderProps) {
  const config = useOrganizationConfigStore((state) => state.config);
  const embedPreview =
    typeof window !== "undefined" && isEmbedPreviewMode();

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

  useEffect(() => {
    if (embedPreview || !config?.customJS) {
      const scriptElement = document.getElementById("custom-org-js");
      if (scriptElement) scriptElement.remove();
      return;
    }

    const scriptId = "custom-org-js";
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement;

    if (!scriptElement) {
      scriptElement = document.createElement("script");
      scriptElement.id = scriptId;
      scriptElement.type = "text/javascript";
      document.body.appendChild(scriptElement);
    }

    scriptElement.textContent = config.customJS;
  }, [config?.customJS, embedPreview]);

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
