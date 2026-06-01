import { buildOpenRouterHeaders } from "./openrouter";

/**
 * Generate interactive lesson HTML via OpenRouter (same stack as AI chat).
 */
export async function generatePlaygroundHtmlOpenRouter(
  apiKey: string,
  opts: {
    concept: string;
    instruction: string;
    complexity: "simple" | "detailed";
    batchName: string;
    exam?: string | null;
    language?: string | null;
  }
): Promise<string> {
  const model =
    process.env.OPENROUTER_PLAYGROUND_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL ||
    "deepseek/deepseek-chat-v3-0324";

  const prompt = `You are an expert at creating interactive educational HTML widgets for ${opts.exam || "university"} students studying ${opts.batchName}.

Return ONLY a single self-contained HTML file. No explanation, no markdown fences, no text outside the HTML — ONLY the raw HTML starting with <!DOCTYPE html> or <html>.

Requirements:
- Embedded CSS and JS only — zero external dependencies, no CDN links whatsoever
- Mobile-friendly, works at 600px minimum width
- Dark background: #0A0E1A
- Primary accent color: #3B7BF6 (blue)
- Secondary accent: #8B5CF6 (purple) for secondary elements
- Text color: #E2E8F0 (light gray)
- Surface/border color: #1E2640
- Include clear labels in ${opts.language || "French"}
- The widget MUST be interactive — use sliders, drag-and-drop, click events, or input fields
- Smooth CSS transitions where appropriate
- Include a title bar at the top showing the concept name in the design style

Visualize: ${opts.concept}
The student should be able to: ${opts.instruction}
Complexity: ${opts.complexity} (${opts.complexity === "simple" ? "one primary interaction control" : "multiple controls and feedback displays"})`;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter playground error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let html = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!html) {
    throw new Error("OpenRouter returned empty HTML for playground");
  }

  if (html.startsWith("```")) {
    html = html.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "");
  }
  if (
    !html.toLowerCase().startsWith("<!doctype") &&
    !html.toLowerCase().startsWith("<html")
  ) {
    const htmlStart = html.indexOf("<html");
    if (htmlStart > -1) html = html.slice(htmlStart);
  }

  const lower = html.toLowerCase();
  if (/<script[\s>]/i.test(html) && /\bsrc\s*=/i.test(html)) {
    throw new Error("Generated playground HTML must not load external scripts");
  }
  if (/\b(src|href)\s*=\s*["']https?:\/\//i.test(html)) {
    throw new Error("Generated playground HTML must not reference external URLs");
  }
  if (!lower.includes("<html")) {
    throw new Error("Generated playground HTML is not a complete document");
  }

  return html;
}
