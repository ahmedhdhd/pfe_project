import type { OrganizationUiConfig } from "./schema";
import { resolveUiConfig } from "./resolve-ui-config";

export interface ResolvedTheme {
  uiConfig: OrganizationUiConfig;
  cssVars: Record<string, string>;
  dataAttributes: Record<string, string>;
}

const RADIUS_MAP: Record<string, string> = {
  none: "0",
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem",
  full: "9999px",
};

const FONT_MAP: Record<string, string> = {
  inter: "Inter, sans-serif",
  geist: "var(--font-geist-sans), sans-serif",
  "source-serif": "Source Serif 4, serif",
  "dm-sans": "DM Sans, sans-serif",
};

const SHADOW_MAP: Record<string, string> = {
  flat: "var(--shadow-xs)",
  soft: "var(--shadow-md)",
  elevated: "var(--shadow-xl)",
};

export function resolveTheme(
  input?: OrganizationUiConfig | null,
  patch?: Parameters<typeof resolveUiConfig>[1]
): ResolvedTheme {
  const uiConfig = resolveUiConfig(input, patch);
  const tokens = uiConfig.tokens || {};
  const variants = uiConfig.variants || {};
  const layout = uiConfig.layout || {};

  const cssVars: Record<string, string> = {};
  if (tokens.radius) cssVars["--radius"] = RADIUS_MAP[tokens.radius] ?? RADIUS_MAP.sm;
  if (tokens.fontFamily)
    cssVars["--font-sans"] = FONT_MAP[tokens.fontFamily] ?? FONT_MAP.inter;
  if (tokens.shadow)
    cssVars["--ui-shadow"] = SHADOW_MAP[tokens.shadow] ?? SHADOW_MAP.soft;

  const dataAttributes: Record<string, string> = {
    "data-ui-preset": uiConfig.preset || "default",
    "data-ui-density": tokens.density || "comfortable",
    "data-ui-surface": tokens.surface || "solid",
    "data-ui-button": variants.button || "default",
    "data-ui-card": variants.card || "default",
    "data-ui-sidebar": variants.sidebar || "light",
    "data-ui-header": variants.header || "default",
    "data-ui-homepage": layout.homepage || "classic",
    "data-ui-admin-shell": layout.adminShell || "sidebar-default",
    "data-ui-student-shell": layout.studentShell || "default",
  };

  return { uiConfig, cssVars, dataAttributes };
}

export function applyThemeToDocument(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  for (const [key, value] of Object.entries(resolved.dataAttributes)) {
    root.setAttribute(key, value);
  }

  for (const [key, value] of Object.entries(resolved.cssVars)) {
    root.style.setProperty(key, value);
  }
}

export function clearThemeDataAttributes(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const attr of root.getAttributeNames()) {
    if (attr.startsWith("data-ui-")) root.removeAttribute(attr);
  }
}
