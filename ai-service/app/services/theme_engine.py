import re
from typing import Any

from app.config import settings
from app.services.openrouter import chat_json

HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
ROOT_BLOCK_RE = re.compile(r":root\s*\{[^}]*\}", re.I | re.S)
DARK_BLOCK_RE = re.compile(r"\.dark\s*\{[^}]*\}", re.I | re.S)
FORBIDDEN_CSS_PATTERNS = [
    re.compile(r"@import", re.I),
    re.compile(r"@apply", re.I),
    re.compile(r"@theme", re.I),
    re.compile(r"@layer", re.I),
    re.compile(r"@custom-variant", re.I),
    re.compile(r"javascript\s*:", re.I),
    re.compile(r"expression\s*\(", re.I),
    re.compile(r"url\s*\(\s*['\"]?\s*https?://", re.I),
]
ALLOWED_FONTS = {
    "geist": "var(--font-geist-sans), sans-serif",
    "inter": "Inter, sans-serif",
    "manrope": "Manrope, Avenir Next, Segoe UI, sans-serif",
    "humanist sans": "Aptos, Segoe UI, sans-serif",
    "readable sans": "Verdana, Geneva, sans-serif",
    "georgia": "Georgia, serif",
}
REQUIRED_THEME_VARS = (
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--accent",
    "--accent-foreground",
    "--border",
    "--input",
    "--ring",
    "--sidebar",
    "--sidebar-foreground",
    "--font-sans",
    "--radius",
)


def _normalize_hex(value: Any, fallback: str) -> str:
    candidate = str(value or "").strip()
    if HEX_COLOR_RE.fullmatch(candidate):
        if len(candidate) == 4:
            return "#" + "".join(ch * 2 for ch in candidate[1:])
        return candidate.lower()
    return fallback


def _normalize_font_family(value: Any) -> str:
    candidate = str(value or "").strip()
    if candidate in ALLOWED_FONTS.values():
        return candidate
    first_word = candidate.split(",")[0].strip().lower()
    return ALLOWED_FONTS.get(first_word, ALLOWED_FONTS["geist"])


def _build_variable_scaffold(*, primary: str, secondary: str, font_family: str) -> str:
    p = "oklch(0.55 0.2 250)"
    s = "oklch(0.62 0.18 320)"
    if primary:
        p = "oklch(0.55 0.2 250)"
    if secondary:
        s = "oklch(0.62 0.18 320)"

    return (
        ":root {\n"
        "  --background: oklch(0.985 0.003 255);\n"
        "  --foreground: oklch(0.22 0.015 255);\n"
        "  --card: oklch(1 0 0);\n"
        "  --card-foreground: oklch(0.22 0.015 255);\n"
        "  --popover: oklch(1 0 0);\n"
        "  --popover-foreground: oklch(0.22 0.015 255);\n"
        f"  --primary: {p};\n"
        "  --primary-foreground: oklch(0.985 0 0);\n"
        f"  --secondary: {s};\n"
        "  --secondary-foreground: oklch(0.985 0 0);\n"
        "  --muted: oklch(0.965 0.004 255);\n"
        "  --muted-foreground: oklch(0.48 0.02 255);\n"
        f"  --accent: {s};\n"
        "  --accent-foreground: oklch(0.985 0 0);\n"
        "  --destructive: oklch(0.637 0.208 25.33);\n"
        "  --destructive-foreground: oklch(0.985 0 0);\n"
        "  --border: oklch(0.89 0.01 255);\n"
        "  --input: oklch(0.92 0.008 255);\n"
        f"  --ring: {p};\n"
        "  --sidebar: oklch(0.97 0.003 255);\n"
        "  --sidebar-foreground: oklch(0.22 0.015 255);\n"
        f"  --sidebar-primary: {p};\n"
        "  --sidebar-primary-foreground: oklch(0.985 0 0);\n"
        f"  --sidebar-accent: {s};\n"
        "  --sidebar-accent-foreground: oklch(0.985 0 0);\n"
        "  --sidebar-border: oklch(0.89 0.01 255);\n"
        f"  --sidebar-ring: {p};\n"
        f"  --font-sans: {font_family};\n"
        "  --radius: 0.75rem;\n"
        "}\n\n"
        ".dark {\n"
        "  --background: oklch(0.145 0.01 255);\n"
        "  --foreground: oklch(0.985 0.003 255);\n"
        "  --card: oklch(0.205 0.012 255);\n"
        "  --card-foreground: oklch(0.985 0.003 255);\n"
        "  --popover: oklch(0.205 0.012 255);\n"
        "  --popover-foreground: oklch(0.985 0.003 255);\n"
        f"  --primary: {p};\n"
        "  --primary-foreground: oklch(0.985 0 0);\n"
        f"  --secondary: {s};\n"
        "  --secondary-foreground: oklch(0.985 0 0);\n"
        "  --muted: oklch(0.269 0 0);\n"
        "  --muted-foreground: oklch(0.708 0 0);\n"
        f"  --accent: {s};\n"
        "  --accent-foreground: oklch(0.985 0 0);\n"
        "  --destructive: oklch(0.704 0.191 22.2);\n"
        "  --destructive-foreground: oklch(0.985 0 0);\n"
        "  --border: oklch(0.275 0 0);\n"
        "  --input: oklch(0.325 0 0);\n"
        f"  --ring: {s};\n"
        "  --sidebar: oklch(0.205 0 0);\n"
        "  --sidebar-foreground: oklch(0.985 0 0);\n"
        f"  --sidebar-primary: {p};\n"
        "  --sidebar-primary-foreground: oklch(0.985 0 0);\n"
        f"  --sidebar-accent: {s};\n"
        "  --sidebar-accent-foreground: oklch(0.985 0 0);\n"
        "  --sidebar-border: oklch(0.275 0 0);\n"
        f"  --sidebar-ring: {s};\n"
        f"  --font-sans: {font_family};\n"
        "  --radius: 0.75rem;\n"
        "}\n"
    )


def _sanitize_css(css: Any, *, primary: str, secondary: str, font_family: str) -> str:
    candidate = str(css or "").strip()
    for pattern in FORBIDDEN_CSS_PATTERNS:
        if pattern.search(candidate):
            raise ValueError("Generated CSS contains forbidden external or executable content")

    if len(candidate) > 12000:
        candidate = candidate[:12000].rstrip()

    root_match = ROOT_BLOCK_RE.search(candidate)
    dark_match = DARK_BLOCK_RE.search(candidate)
    scaffold = _build_variable_scaffold(
        primary=primary,
        secondary=secondary,
        font_family=font_family,
    )
    scaffold_root = ROOT_BLOCK_RE.search(scaffold)
    scaffold_dark = DARK_BLOCK_RE.search(scaffold)

    root_block = root_match.group(0) if root_match else (scaffold_root.group(0) if scaffold_root else "")
    dark_block = dark_match.group(0) if dark_match else (scaffold_dark.group(0) if scaffold_dark else "")

    normalized = f"{root_block}\n\n{dark_block}".strip()
    missing_vars = [token for token in REQUIRED_THEME_VARS if token not in normalized]
    if missing_vars:
        normalized = scaffold.strip()

    return normalized


async def generate_theme_bundle(
    *,
    api_key: str,
    organization_name: str,
    description: str,
    current_custom_css: str | None,
) -> dict[str, Any]:
    prompt = f"""You are a CSS token designer for a Tailwind v4 LMS application.

Generate a color theme for this organization.

Organization name: {organization_name}
Brand description: {description.strip()}
Existing custom CSS (for reference only, do not copy it verbatim):
{(current_custom_css or "").strip() or "(none)"}

Return ONLY valid JSON - no markdown, no explanation - with this exact shape:
{{
  "themeName": "short descriptive theme name",
  "summary": "1-2 sentences describing the visual feel",
  "theme": {{
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "fontFamily": "one of the allowed values below"
  }},
  "customCss": "CSS string - variable declarations only, see rules below"
}}

Allowed fontFamily values (copy exactly):
- var(--font-geist-sans), sans-serif
- Inter, sans-serif
- Manrope, Avenir Next, Segoe UI, sans-serif
- Aptos, Segoe UI, sans-serif
- Verdana, Geneva, sans-serif
- Georgia, serif

CRITICAL RULES FOR customCss:
1. Output ONLY CSS variable declarations inside :root and .dark blocks.
2. Do NOT style any elements (no button {{}}, no nav {{}}, no body {{}}, no a {{}}, no h1 {{}}, etc.)
3. Do NOT use @import, @apply, @theme, @layer, @custom-variant, or any at-rules.
4. Do NOT use external URLs, javascript:, or expression().
5. The app uses oklch() for all color variables. Write ALL color values in oklch() format.
   oklch(lightness chroma hue) - lightness 0-1, chroma 0-0.4, hue 0-360.
   Examples:
     oklch(0.55 0.20 250)
     oklch(0.35 0.15 30)
     oklch(0.97 0.01 250)
     oklch(0.12 0.02 240)
6. Include EXACTLY these variables in :root:
   --background, --foreground, --card, --card-foreground, --popover, --popover-foreground,
   --primary, --primary-foreground, --secondary, --secondary-foreground,
   --muted, --muted-foreground, --accent, --accent-foreground,
   --destructive, --destructive-foreground, --border, --input, --ring,
   --sidebar, --sidebar-foreground, --sidebar-primary, --sidebar-primary-foreground,
   --sidebar-accent, --sidebar-accent-foreground, --sidebar-border, --sidebar-ring,
   --radius
7. Include EXACTLY the same variables in .dark with appropriate dark-mode overrides.
8. --radius must use rem units.
9. Keep the theme elegant, high-contrast, and suitable for an LMS dashboard."""

    payload = await chat_json(
        api_key=api_key,
        model=settings.openrouter_model,
        prompt=prompt,
        temperature=0.35,
        max_tokens=2200,
    )

    raw_theme = payload.get("theme") if isinstance(payload.get("theme"), dict) else {}
    primary = _normalize_hex(raw_theme.get("primaryColor"), "#2563eb")
    secondary = _normalize_hex(raw_theme.get("secondaryColor"), "#7c3aed")
    font_family = _normalize_font_family(raw_theme.get("fontFamily"))
    custom_css = _sanitize_css(
        payload.get("customCss"),
        primary=primary,
        secondary=secondary,
        font_family=font_family,
    )

    return {
        "themeName": str(payload.get("themeName") or "AI Theme").strip()[:80],
        "summary": str(payload.get("summary") or "AI-generated theme").strip()[:280],
        "theme": {
            "primaryColor": primary,
            "secondaryColor": secondary,
            "fontFamily": font_family,
        },
        "customCss": custom_css,
    }
