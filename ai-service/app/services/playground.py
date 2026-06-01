import re

from app.config import settings
from app.services.openrouter import chat_completion


async def generate_playground_html(
    *,
    api_key: str,
    concept: str,
    instruction: str,
    batch_name: str,
    exam: str | None,
    language: str | None,
) -> str:
    model = (
        settings.openrouter_playground_model.strip()
        or settings.openrouter_model
    )
    lang = language or "French"
    exam_label = exam or "university"

    prompt = f"""You are an expert at creating interactive educational HTML widgets for {exam_label} students studying {batch_name}.

Return ONLY a single self-contained HTML file. No explanation, no markdown fences, no text outside the HTML — ONLY the raw HTML starting with <!DOCTYPE html> or <html>.

Requirements:
- Embedded CSS and JS only — zero external dependencies, no CDN links whatsoever
- Mobile-friendly, works at 600px minimum width
- Dark background: #0A0E1A
- Primary accent color: #3B7BF6 (blue)
- Secondary accent: #8B5CF6 (purple) for secondary elements
- Text color: #E2E8F0 (light gray)
- Surface/border color: #1E2640
- Include clear labels in {lang}
- The widget MUST be interactive — use sliders, drag-and-drop, click events, or input fields
- Smooth CSS transitions where appropriate
- Include a title bar at the top showing the concept name in the design style

Visualize: {concept}
The student should be able to: {instruction}
Complexity: detailed (multiple controls and feedback displays)"""

    html = await chat_completion(
        api_key=api_key,
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=8192,
    )

    if html.startswith("```"):
        html = re.sub(r"^```(?:html)?\n?", "", html)
        html = re.sub(r"\n?```$", "", html)

    lower = html.lower()
    if not lower.startswith("<!doctype") and not lower.startswith("<html"):
        html_start = html.lower().find("<html")
        if html_start > -1:
            html = html[html_start:]

    if re.search(r"<script[\s>]", html, re.I) and re.search(r"\bsrc\s*=", html, re.I):
        raise RuntimeError("Generated playground HTML must not load external scripts")
    if re.search(r'\b(src|href)\s*=\s*["\']https?://', html, re.I):
        raise RuntimeError("Generated playground HTML must not reference external URLs")
    if "<html" not in lower:
        raise RuntimeError("Generated playground HTML is not a complete document")

    return html
