import colorsys
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
COLOR_KEYWORDS = {
    "green": 145.0,
    "emerald": 155.0,
    "mint": 165.0,
    "teal": 185.0,
    "cyan": 210.0,
    "blue": 250.0,
    "indigo": 275.0,
    "violet": 295.0,
    "purple": 305.0,
    "magenta": 330.0,
    "pink": 350.0,
    "rose": 18.0,
    "red": 28.0,
    "orange": 55.0,
    "amber": 75.0,
    "yellow": 95.0,
    "lime": 125.0,
}
REQUIRED_THEME_VARS = (
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--destructive-foreground",
    "--border",
    "--input",
    "--ring",
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
    "--font-sans",
    "--font-serif",
    "--font-mono",
    "--radius",
    "--shadow-x",
    "--shadow-y",
    "--shadow-blur",
    "--shadow-spread",
    "--shadow-opacity",
    "--shadow-color",
    "--shadow-2xs",
    "--shadow-xs",
    "--shadow-sm",
    "--shadow",
    "--shadow-md",
    "--shadow-lg",
    "--shadow-xl",
    "--shadow-2xl",
    "--tracking-normal",
    "--spacing",
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


def _normalize_hue(value: float) -> float:
    return value % 360.0


def _format_oklch(lightness: float, chroma: float, hue: float) -> str:
    return f"oklch({lightness:.3f} {chroma:.3f} {_normalize_hue(hue):.1f})"


def _extract_keyword_hues(description: str) -> list[float]:
    text = description.lower()
    hues: list[float] = []
    for keyword, hue in COLOR_KEYWORDS.items():
        if re.search(rf"\b{re.escape(keyword)}\b", text):
            hues.append(hue)
    return hues


def _hex_to_hue(value: str | None) -> float | None:
    if not value:
        return None
    hex_value = _normalize_hex(value, "")
    if not HEX_COLOR_RE.fullmatch(hex_value):
        return None
    red = int(hex_value[1:3], 16) / 255.0
    green = int(hex_value[3:5], 16) / 255.0
    blue = int(hex_value[5:7], 16) / 255.0
    hue, _lightness, saturation = colorsys.rgb_to_hls(red, green, blue)
    if saturation < 0.03:
        return None
    return hue * 360.0


def _resolve_palette_hues(primary: str, secondary: str, description: str) -> tuple[float, float]:
    keyword_hues = _extract_keyword_hues(description)
    primary_hue = _hex_to_hue(primary)
    secondary_hue = _hex_to_hue(secondary)

    if keyword_hues:
        primary_hue = keyword_hues[0]
        if len(keyword_hues) > 1:
            secondary_hue = keyword_hues[1]

    if primary_hue is None:
        primary_hue = 145.0
    if secondary_hue is None:
        secondary_hue = primary_hue + 170.0

    if abs(primary_hue - secondary_hue) < 8:
        secondary_hue = primary_hue + 170.0

    return _normalize_hue(primary_hue), _normalize_hue(secondary_hue)


def _build_variable_scaffold(
    *, primary: str, secondary: str, font_family: str, description: str
) -> str:
    primary_hue, secondary_hue = _resolve_palette_hues(primary, secondary, description)

    light_primary = _format_oklch(0.620, 0.160, primary_hue)
    light_secondary = _format_oklch(0.680, 0.160, secondary_hue)
    light_background = _format_oklch(0.985, 0.004, primary_hue)
    light_foreground = _format_oklch(0.220, 0.018, primary_hue)
    light_muted = _format_oklch(0.965, 0.006, primary_hue)
    light_muted_fg = _format_oklch(0.480, 0.025, primary_hue)
    light_accent = _format_oklch(0.930, 0.025, secondary_hue)
    light_accent_fg = _format_oklch(0.380, 0.120, secondary_hue)
    light_border = _format_oklch(0.890, 0.010, primary_hue)
    light_input = _format_oklch(0.920, 0.008, primary_hue)
    light_sidebar = _format_oklch(0.970, 0.005, primary_hue)
    light_sidebar_border = _format_oklch(0.900, 0.010, primary_hue)

    dark_background = _format_oklch(0.145, 0.012, primary_hue)
    dark_foreground = _format_oklch(0.985, 0.004, primary_hue)
    dark_card = _format_oklch(0.205, 0.014, primary_hue)
    dark_popover = _format_oklch(0.205, 0.014, primary_hue)
    dark_secondary = _format_oklch(0.560, 0.140, secondary_hue)
    dark_muted = _format_oklch(0.269, 0.010, primary_hue)
    dark_muted_fg = _format_oklch(0.708, 0.010, primary_hue)
    dark_accent = _format_oklch(0.320, 0.040, secondary_hue)
    dark_accent_fg = _format_oklch(0.900, 0.050, secondary_hue)
    dark_border = _format_oklch(0.275, 0.010, primary_hue)
    dark_input = _format_oklch(0.325, 0.010, primary_hue)
    dark_sidebar = _format_oklch(0.205, 0.014, primary_hue)

    chart_1 = _format_oklch(0.680, 0.130, primary_hue)
    chart_2 = _format_oklch(0.720, 0.140, secondary_hue)
    chart_3 = _format_oklch(0.580, 0.110, primary_hue + 28)
    chart_4 = _format_oklch(0.520, 0.100, secondary_hue - 24)
    chart_5 = _format_oklch(0.440, 0.090, primary_hue + 58)

    return (
        ":root {\n"
        f"  --background: {light_background};\n"
        f"  --foreground: {light_foreground};\n"
        "  --card: oklch(1 0 0);\n"
        f"  --card-foreground: {light_foreground};\n"
        "  --popover: oklch(1 0 0);\n"
        f"  --popover-foreground: {light_foreground};\n"
        f"  --primary: {light_primary};\n"
        "  --primary-foreground: oklch(0.985 0 0);\n"
        f"  --secondary: {light_secondary};\n"
        "  --secondary-foreground: oklch(0.985 0 0);\n"
        f"  --muted: {light_muted};\n"
        f"  --muted-foreground: {light_muted_fg};\n"
        f"  --accent: {light_accent};\n"
        f"  --accent-foreground: {light_accent_fg};\n"
        "  --destructive: oklch(0.637 0.208 25.3);\n"
        "  --destructive-foreground: oklch(0.985 0 0);\n"
        f"  --border: {light_border};\n"
        f"  --input: {light_input};\n"
        f"  --ring: {light_primary};\n"
        f"  --chart-1: {chart_1};\n"
        f"  --chart-2: {chart_2};\n"
        f"  --chart-3: {chart_3};\n"
        f"  --chart-4: {chart_4};\n"
        f"  --chart-5: {chart_5};\n"
        f"  --sidebar: {light_sidebar};\n"
        f"  --sidebar-foreground: {light_foreground};\n"
        f"  --sidebar-primary: {light_primary};\n"
        "  --sidebar-primary-foreground: oklch(0.985 0 0);\n"
        f"  --sidebar-accent: {light_accent};\n"
        f"  --sidebar-accent-foreground: {light_accent_fg};\n"
        f"  --sidebar-border: {light_sidebar_border};\n"
        f"  --sidebar-ring: {light_primary};\n"
        f"  --font-sans: {font_family};\n"
        '  --font-serif: "Source Serif 4", serif;\n'
        '  --font-mono: "JetBrains Mono", monospace;\n'
        "  --radius: 0.75rem;\n"
        "  --shadow-x: 0px;\n"
        "  --shadow-y: 1px;\n"
        "  --shadow-blur: 3px;\n"
        "  --shadow-spread: 0px;\n"
        "  --shadow-opacity: 0.1;\n"
        "  --shadow-color: hsl(0 0% 0%);\n"
        "  --shadow-2xs: 0px 1px 3px 0px hsl(0 0% 0% / 0.05);\n"
        "  --shadow-xs: 0px 1px 3px 0px hsl(0 0% 0% / 0.05);\n"
        "  --shadow-sm: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 1px 2px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 1px 2px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-md: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 2px 4px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-lg: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 4px 6px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-xl: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 8px 10px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-2xl: 0px 1px 3px 0px hsl(0 0% 0% / 0.25);\n"
        "  --tracking-normal: 0em;\n"
        "  --spacing: 0.25rem;\n"
        "}\n\n"
        ".dark {\n"
        f"  --background: {dark_background};\n"
        f"  --foreground: {dark_foreground};\n"
        f"  --card: {dark_card};\n"
        f"  --card-foreground: {dark_foreground};\n"
        f"  --popover: {dark_popover};\n"
        f"  --popover-foreground: {dark_foreground};\n"
        f"  --primary: {light_primary};\n"
        "  --primary-foreground: oklch(0.985 0 0);\n"
        f"  --secondary: {dark_secondary};\n"
        "  --secondary-foreground: oklch(0.985 0 0);\n"
        f"  --muted: {dark_muted};\n"
        f"  --muted-foreground: {dark_muted_fg};\n"
        f"  --accent: {dark_accent};\n"
        f"  --accent-foreground: {dark_accent_fg};\n"
        "  --destructive: oklch(0.704 0.191 22.2);\n"
        "  --destructive-foreground: oklch(0.985 0 0);\n"
        f"  --border: {dark_border};\n"
        f"  --input: {dark_input};\n"
        f"  --ring: {dark_secondary};\n"
        f"  --chart-1: {chart_1};\n"
        f"  --chart-2: {chart_2};\n"
        f"  --chart-3: {chart_3};\n"
        f"  --chart-4: {chart_4};\n"
        f"  --chart-5: {chart_5};\n"
        f"  --sidebar: {dark_sidebar};\n"
        f"  --sidebar-foreground: {dark_foreground};\n"
        f"  --sidebar-primary: {light_primary};\n"
        "  --sidebar-primary-foreground: oklch(0.985 0 0);\n"
        f"  --sidebar-accent: {dark_accent};\n"
        f"  --sidebar-accent-foreground: {dark_accent_fg};\n"
        f"  --sidebar-border: {dark_border};\n"
        f"  --sidebar-ring: {dark_secondary};\n"
        f"  --font-sans: {font_family};\n"
        '  --font-serif: "Source Serif 4", serif;\n'
        '  --font-mono: "JetBrains Mono", monospace;\n'
        "  --radius: 0.75rem;\n"
        "  --shadow-x: 0px;\n"
        "  --shadow-y: 1px;\n"
        "  --shadow-blur: 3px;\n"
        "  --shadow-spread: 0px;\n"
        "  --shadow-opacity: 0.1;\n"
        "  --shadow-color: hsl(0 0% 0%);\n"
        "  --shadow-2xs: 0px 1px 3px 0px hsl(0 0% 0% / 0.05);\n"
        "  --shadow-xs: 0px 1px 3px 0px hsl(0 0% 0% / 0.05);\n"
        "  --shadow-sm: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 1px 2px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 1px 2px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-md: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 2px 4px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-lg: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 4px 6px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-xl: 0px 1px 3px 0px hsl(0 0% 0% / 0.1), 0px 8px 10px -1px hsl(0 0% 0% / 0.1);\n"
        "  --shadow-2xl: 0px 1px 3px 0px hsl(0 0% 0% / 0.25);\n"
        "  --tracking-normal: 0em;\n"
        "  --spacing: 0.25rem;\n"
        "}\n"
    )


DECLARATION_RE = re.compile(r"(--[\w-]+)\s*:\s*([^;]+);")
STABLE_THEME_VARS = {
    "--font-sans",
    "--font-serif",
    "--font-mono",
    "--radius",
    "--shadow-x",
    "--shadow-y",
    "--shadow-blur",
    "--shadow-spread",
    "--shadow-opacity",
    "--shadow-color",
    "--shadow-2xs",
    "--shadow-xs",
    "--shadow-sm",
    "--shadow",
    "--shadow-md",
    "--shadow-lg",
    "--shadow-xl",
    "--shadow-2xl",
    "--tracking-normal",
    "--spacing",
}


def _extract_declarations(block: str) -> dict[str, str]:
    return {
        key.strip(): value.strip()
        for key, value in DECLARATION_RE.findall(block or "")
    }


def _serialize_block(selector: str, declarations: dict[str, str]) -> str:
    lines = [f"{selector} {{"]
    for token in REQUIRED_THEME_VARS:
        value = declarations.get(token)
        if value:
            lines.append(f"  {token}: {value};")
    lines.append("}")
    return "\n".join(lines)


def _merge_with_scaffold(candidate_block: str, scaffold_block: str) -> str:
    candidate_vars = _extract_declarations(candidate_block)
    scaffold_vars = _extract_declarations(scaffold_block)
    merged: dict[str, str] = {}

    for token in REQUIRED_THEME_VARS:
        scaffold_value = scaffold_vars.get(token)
        candidate_value = candidate_vars.get(token)

        if token in STABLE_THEME_VARS:
            if scaffold_value:
                merged[token] = scaffold_value
            continue

        if candidate_value:
            merged[token] = candidate_value
        elif scaffold_value:
            merged[token] = scaffold_value

    selector = ".dark" if candidate_block.strip().startswith(".dark") else ":root"
    return _serialize_block(selector, merged)


def _sanitize_css(
    css: Any, *, primary: str, secondary: str, font_family: str, description: str
) -> str:
    candidate = str(css or "").strip()
    for pattern in FORBIDDEN_CSS_PATTERNS:
        if pattern.search(candidate):
            raise ValueError("Generated CSS contains forbidden external or executable content")

    if len(candidate) > 20000:
        candidate = candidate[:20000].rstrip()

    scaffold = _build_variable_scaffold(
        primary=primary,
        secondary=secondary,
        font_family=font_family,
        description=description,
    )

    scaffold_root_match = ROOT_BLOCK_RE.search(scaffold)
    scaffold_dark_match = DARK_BLOCK_RE.search(scaffold)
    if not scaffold_root_match or not scaffold_dark_match:
        raise ValueError("Theme scaffold is invalid")

    candidate_root_match = ROOT_BLOCK_RE.search(candidate)
    candidate_dark_match = DARK_BLOCK_RE.search(candidate)

    root_block = _merge_with_scaffold(
        candidate_root_match.group(0) if candidate_root_match else scaffold_root_match.group(0),
        scaffold_root_match.group(0),
    )
    dark_block = _merge_with_scaffold(
        candidate_dark_match.group(0) if candidate_dark_match else scaffold_dark_match.group(0),
        scaffold_dark_match.group(0),
    )

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
6. If the user names colors like green, rose, blue, orange, etc., honor those exact color families.
   Do NOT substitute unrelated hues. Example: green must stay in a green hue family, not blue.
7. Include ALL of these variables in :root:
   --background, --foreground, --card, --card-foreground, --popover, --popover-foreground,
   --primary, --primary-foreground, --secondary, --secondary-foreground,
   --muted, --muted-foreground, --accent, --accent-foreground,
   --destructive, --destructive-foreground, --border, --input, --ring,
   --chart-1, --chart-2, --chart-3, --chart-4, --chart-5,
   --sidebar, --sidebar-foreground, --sidebar-primary, --sidebar-primary-foreground,
   --sidebar-accent, --sidebar-accent-foreground, --sidebar-border, --sidebar-ring,
   --font-sans, --font-serif, --font-mono,
   --radius,
   --shadow-x, --shadow-y, --shadow-blur, --shadow-spread, --shadow-opacity, --shadow-color,
   --shadow-2xs, --shadow-xs, --shadow-sm, --shadow, --shadow-md, --shadow-lg, --shadow-xl, --shadow-2xl,
   --tracking-normal, --spacing
8. Include the same variables in .dark with appropriate dark-mode overrides.
9. --font-sans must match the chosen fontFamily. Use "Source Serif 4", serif for --font-serif and "JetBrains Mono", monospace for --font-mono.
10. --radius must use rem units.
11. Keep the theme elegant, high-contrast, and suitable for an LMS dashboard."""

    payload = await chat_json(
        api_key=api_key,
        model=settings.openrouter_model,
        prompt=prompt,
        temperature=0.35,
        max_tokens=2600,
    )

    raw_theme = payload.get("theme") if isinstance(payload.get("theme"), dict) else {}
    primary = _normalize_hex(raw_theme.get("primaryColor"), "#16a34a")
    secondary = _normalize_hex(raw_theme.get("secondaryColor"), "#e11d48")
    font_family = _normalize_font_family(raw_theme.get("fontFamily"))
    custom_css = _sanitize_css(
        payload.get("customCss"),
        primary=primary,
        secondary=secondary,
        font_family=font_family,
        description=description,
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


