import { buildOpenRouterHeaders } from './openrouter';
import {
  sanitizeUiConfigPatch,
  type UiConfigPatch,
} from './ui-customization';
import { sanitizeCustomCss } from './platform-customization';

export const ONBOARDING_TOTAL_STEPS = 6;

export const ONBOARDING_MODEL =
  process.env.OPENROUTER_ONBOARDING_MODEL?.trim() ||
  process.env.OPENROUTER_MODEL?.trim() ||
  'deepseek/deepseek-chat-v3-0324';

export interface OnboardingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OnboardingPartialConfig {
  organizationName?: string;
  uiPatch?: UiConfigPatch;
  customCSS?: string;
}

export interface OnboardingContext {
  organizationName?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  ctaText?: string;
}

function isApplyConfirmation(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/[\n\r{}]/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('@apply') ||
    lower.includes(':root') ||
    lower.includes('@theme') ||
    lower.includes('@layer')
  ) {
    return false;
  }

  return /^(apply|apply it|apply now|confirm|confirm it|yes apply|approved|go ahead|launch now|please apply|yes|yep|yeah|ok|okay|sure|do it|let's go|allons-y|oui|نعم|نفذ|طبق|موافق)\.?!?$/i.test(
    trimmed
  );
}

function normalizeForMatch(value: string | undefined): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function extractQuotedReplacement(
  text: string
): { from: string; to: string } | null {
  const patterns = [
    /(?:change|replace)\s+(?:this\s+)?[""]([^""]+)[""]\s+(?:to|with)\s+[""]([^""]+)[""]/i,
    /(?:change|replace)\s+(?:this\s+)?[“]([^”]+)[”]\s+(?:to|with)\s+[“]([^”]+)[”]/i,
    /(?:change|replace)\s+(?:this\s+)?[']([^']+)[']\s+(?:to|with)\s+[']([^']+)[']/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && match?.[2]) {
      return {
        from: match[1].trim(),
        to: match[2].trim(),
      };
    }
  }

  return null;
}

function extractRawCssBlock(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fencedMatch = trimmed.match(/```(?:css)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;

  if (
    !candidate.includes(':root') &&
    !candidate.includes('.dark') &&
    !candidate.includes('--background')
  ) {
    return null;
  }

  const firstCssTokenIndex = [
    candidate.indexOf('@import'),
    candidate.indexOf('@custom-variant'),
    candidate.indexOf(':root'),
    candidate.indexOf('.dark'),
    candidate.indexOf('@theme'),
    candidate.indexOf('@layer'),
  ]
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstCssTokenIndex === undefined) {
    return null;
  }

  const css = candidate.slice(firstCssTokenIndex).trim();
  return css || null;
}

function inferPatchFromLatestMessage(
  messages: OnboardingMessage[],
  context?: OnboardingContext
): OnboardingPartialConfig {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')?.content;

  if (!latestUserMessage) {
    return {};
  }

  const inferred: OnboardingPartialConfig = {};
  const rawCss = extractRawCssBlock(latestUserMessage);
  if (rawCss) {
    const sanitizedCss = sanitizeCustomCss(rawCss);
    if (sanitizedCss) {
      inferred.customCSS = sanitizedCss;
    }
  }

  const replacement = extractQuotedReplacement(latestUserMessage);
  if (!replacement) {
    return inferred;
  }

  const source = normalizeForMatch(replacement.from);
  const target = replacement.to;

  if (source && source === normalizeForMatch(context?.heroTitle)) {
    inferred.uiPatch = {
      homepage: {
        heroTitle: target,
      },
    };
  } else if (source && source === normalizeForMatch(context?.heroSubtitle)) {
    inferred.uiPatch = {
      homepage: {
        heroSubtitle: target,
      },
    };
  } else if (source && source === normalizeForMatch(context?.organizationName)) {
    inferred.organizationName = target;
  }

  return inferred;
}

function mergePartialConfigs(
  base: OnboardingPartialConfig,
  inferred: OnboardingPartialConfig
): OnboardingPartialConfig {
  const mergedUiPatch =
    base.uiPatch || inferred.uiPatch
      ? {
          ...base.uiPatch,
          ...inferred.uiPatch,
          tokens: { ...base.uiPatch?.tokens, ...inferred.uiPatch?.tokens },
          variants: { ...base.uiPatch?.variants, ...inferred.uiPatch?.variants },
          layout: { ...base.uiPatch?.layout, ...inferred.uiPatch?.layout },
          homepage: {
            ...base.uiPatch?.homepage,
            ...inferred.uiPatch?.homepage,
          },
        }
      : undefined;

  return {
    organizationName: inferred.organizationName ?? base.organizationName,
    customCSS: inferred.customCSS ?? base.customCSS,
    uiPatch: mergedUiPatch,
  };
}

function stripCodeFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('AI response did not contain JSON');
  }

  const candidates = [trimmed, stripCodeFences(trimmed)];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      // try next candidate
    }
  }

  const objectMatch = stripCodeFences(trimmed).match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const raw = objectMatch[0];
    const relaxed = raw.replace(/,\s*([}\]])/g, '$1');
    for (const attempt of [raw, relaxed]) {
      try {
        return JSON.parse(attempt) as Record<string, unknown>;
      } catch {
        // continue
      }
    }
  }

  throw new Error('AI response did not contain JSON');
}

/** Parse onboarding chat JSON, or fall back to plain-text model output */
export function parseOnboardingChatResponse(content: string): {
  reply: string;
  done: boolean;
} {
  try {
    const parsed = extractJsonObject(content);
    const reply =
      typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    if (reply) {
      return { reply, done: Boolean(parsed.done) };
    }
  } catch {
    // fall through to plain-text handling
  }

  let reply = stripCodeFences(content.trim());
  reply = reply.replace(/^\{[\s\S]*\}$/m, '').trim();
  if (!reply) {
    reply =
      'Welcome. Share any branding and homepage details you want, and I will review them before applying.';
  }

  return { reply, done: false };
}

async function callOpenRouterChat(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const fallbackModel =
    process.env.OPENROUTER_MODEL?.trim() || 'deepseek/deepseek-chat-v3-0324';
  const models = Array.from(
    new Set([ONBOARDING_MODEL, fallbackModel].filter(Boolean))
  );

  let lastError = 'OpenRouter request failed';
  for (const model of models) {
    const jsonAttempts = options?.jsonMode ? [true, false] : [false];
    for (const useJsonMode of jsonAttempts) {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: buildOpenRouterHeaders(apiKey),
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            temperature: options?.temperature ?? 0.4,
            max_tokens: options?.maxTokens ?? 1200,
            ...(useJsonMode
              ? { response_format: { type: 'json_object' } }
              : {}),
          }),
        }
      );

      const raw = await response.text();
      if (!response.ok) {
        lastError = raw.slice(0, 300);
        const jsonModeRejected =
          useJsonMode &&
          (raw.includes('response_format') ||
            raw.includes('json_object') ||
            raw.includes('structured'));
        if (jsonModeRejected) {
          continue;
        }
        const unavailable =
          response.status === 404 ||
          raw.includes('No endpoints found') ||
          raw.includes('not found');
        if (unavailable && model !== models[models.length - 1]) {
          break;
        }
        if (model === models[models.length - 1] && !useJsonMode) {
          throw new Error(`OpenRouter failed: ${lastError}`);
        }
        continue;
      }

      const payload = JSON.parse(raw) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return payload.choices?.[0]?.message?.content?.trim() || '';
    }
  }

  throw new Error(`OpenRouter failed: ${lastError}`);
}

export async function runOnboardingChat(
  apiKey: string,
  messages: OnboardingMessage[],
  context?: OnboardingContext
): Promise<{ reply: string; done: boolean }> {
  const contextJson = JSON.stringify(context || {});
  const systemPrompt = `You are a concise, decisive UI theme assistant for Tesla Academy (LMS admin onboarding).
Your job: help the admin pick a look and feel, then apply it immediately when they're ready.

## Named platform themes — recognize and implement these instantly:
- "claude theme" / "anthropic theme" → clean neutral grayscale, system-sans font, minimal preset, subtle shadows, rounded-md radius, light sidebar. Primary: #1a1a1a, secondary: #666666.
- "shadcn theme" / "shadcn/ui theme" → neutral zinc palette, sharp radius, flat shadows, clean minimal. Primary: #18181b, secondary: #71717a.
- "vercel theme" → pure black/white contrast, sharp corners, bold typography, futuristic preset. Primary: #000000, secondary: #888888.
- "notion theme" → warm off-white, serif font option, soft shadows, comfortable density. Primary: #37352f, secondary: #9b9b9b.
- "linear theme" → indigo/purple palette, bold preset, pill buttons, elevated shadows. Primary: #5e6ad2, secondary: #a8b1ff.
- "github theme" → blue accent on white, default preset, system font. Primary: #0969da, secondary: #57606a.
If the user names any well-known design system or product, map it to the closest sensible CSS token set and apply it directly.

## Behavior rules:
1. When the user names a theme ("claude theme", "mechanical", "minimal") → propose it in ONE sentence summary + set done:true if they already said any form of yes/ok/sure earlier, or just confirm and wait one turn.
2. When the user says "you choose" / "choose for me" / "decide yourself" / "i dont know" → pick something good immediately, announce what you chose in 1-2 sentences, set done:true. Do NOT ask for another confirmation — they already gave you permission.
3. When the user says yes/ok/sure/apply/go ahead/do it → set done:true immediately. Never ask "are you sure?" after a confirmation.
4. When the user says "no, i want X instead" → acknowledge the switch, summarize the new theme, set done:true if X is clear enough to apply.
5. When the user pastes raw CSS → confirm you will use it, set done:true.
6. Never repeat a confirmation question more than once. If you already asked "shall I apply?" and the user says anything affirmative, apply it.
7. Keep replies SHORT — 1-4 sentences max. No bullet lists unless showing a theme summary.
8. Never ask for information the user hasn't offered. Don't interrogate.
9. If the user sends an empty or unclear message, reply with one short open question maximum.

## Theme vocabulary you can propose:
- Presets: default, minimal, bold, academic, futuristic
- Colors: any valid hex
- Fonts: inter, geist, source-serif, dm-sans
- Radius: none (sharp), sm, md, lg, full (pill)
- Density: compact, comfortable, spacious
- Button style: default, pill, sharp
- Card style: default, bordered, glass, flat
- Sidebar: light, dark, brand

## Opening message (when conversation is empty):
Reply with exactly: "What style do you want for your platform? You can name a theme (minimal, bold, academic, futuristic, claude theme…), describe a mood, paste CSS, or just say 'surprise me'."

Current config:
${contextJson}

CRITICAL: Respond with JSON only — {"reply":"...","done":false}
Set done:true when: user confirms (yes/ok/sure/apply/go ahead/do it), user said "you choose", user said "surprise me", or user approved a specific theme with any affirmative signal.`;

  const chatMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (chatMessages.length === 0) {
    return {
      reply:
        "What style do you want for your platform? You can name a theme (minimal, bold, academic, futuristic, claude theme…), describe a mood, paste CSS, or just say 'surprise me'.",
      done: false,
    };
  }

  const content = await callOpenRouterChat(apiKey, systemPrompt, chatMessages, {
    temperature: 0.45,
    maxTokens: 900,
    jsonMode: true,
  });

  const parsed = parseOnboardingChatResponse(content);
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'user')?.content;
  const userConfirmed = Boolean(lastUserMessage && isApplyConfirmation(lastUserMessage));

  return {
    reply: parsed.reply,
    done: userConfirmed && parsed.done,
  };
}

export async function parseOnboardingAnswer(
  apiKey: string,
  messages: OnboardingMessage[],
  context?: OnboardingContext
): Promise<OnboardingPartialConfig> {
  const contextJson = JSON.stringify(context || {});
  const systemPrompt = `Extract the final agreed UI customization from this onboarding conversation.
Return JSON only — no markdown, no explanation.

JSON shape:
{
  "organizationName": "string or omit",
  "uiPatch": {
    "preset": "default|minimal|bold|academic|futuristic",
    "tokens": {
      "primaryColor": "#hex",
      "secondaryColor": "#hex",
      "fontFamily": "inter|geist|source-serif|dm-sans",
      "radius": "none|sm|md|lg|full",
      "density": "compact|comfortable|spacious",
      "shadow": "flat|soft|elevated",
      "surface": "solid|muted|glass"
    },
    "variants": {
      "button": "default|pill|sharp",
      "card": "default|bordered|glass|flat",
      "sidebar": "light|dark|brand",
      "header": "default|transparent|solid"
    },
    "layout": { "homepage": "classic|hero-center|split", "adminShell": "sidebar-default|sidebar-compact" },
    "homepage": {
      "heroTitle": "...",
      "heroSubtitle": "...",
      "ctaText": "Get Started",
      "ctaUrl": "/login",
      "sections": ["hero","features","testimonials","faq","cta"],
      "features": [{ "title": "...", "description": "...", "icon": "brain|book|calendar|award|file|users|graduation-cap" }]
    }
  },
  "customCSS": "optional full :root { } .dark { } @theme inline { } block — omit if not needed"
}

## Named theme mappings — when the user named one of these, output these exact tokens:

"claude theme" or "anthropic theme":
  preset: "minimal", tokens: { primaryColor: "#1a1a1a", secondaryColor: "#666666", fontFamily: "inter", radius: "md", density: "comfortable", shadow: "soft", surface: "solid" }, variants: { button: "default", card: "default", sidebar: "light", header: "default" }

"shadcn theme" or "shadcn/ui":
  preset: "minimal", tokens: { primaryColor: "#18181b", secondaryColor: "#71717a", fontFamily: "inter", radius: "sm", density: "comfortable", shadow: "flat", surface: "solid" }, variants: { button: "sharp", card: "flat", sidebar: "light" }

"vercel theme":
  preset: "futuristic", tokens: { primaryColor: "#000000", secondaryColor: "#888888", fontFamily: "geist", radius: "none", density: "compact", shadow: "flat", surface: "solid" }, variants: { button: "sharp", card: "bordered", sidebar: "dark", header: "solid" }

"notion theme":
  preset: "minimal", tokens: { primaryColor: "#37352f", secondaryColor: "#9b9b9b", fontFamily: "source-serif", radius: "sm", density: "comfortable", shadow: "soft", surface: "muted" }, variants: { button: "default", card: "flat", sidebar: "light" }

"linear theme":
  preset: "bold", tokens: { primaryColor: "#5e6ad2", secondaryColor: "#a8b1ff", fontFamily: "inter", radius: "md", density: "comfortable", shadow: "elevated", surface: "solid" }, variants: { button: "pill", card: "bordered", sidebar: "dark" }

"github theme":
  preset: "default", tokens: { primaryColor: "#0969da", secondaryColor: "#57606a", fontFamily: "inter", radius: "sm", density: "comfortable", shadow: "soft", surface: "solid" }, variants: { button: "default", card: "default", sidebar: "light" }

"mechanical theme" or "blueprint theme":
  preset: "futuristic", tokens: { primaryColor: "#808080", secondaryColor: "#0077cc", fontFamily: "dm-sans", radius: "none", density: "compact", shadow: "elevated", surface: "solid" }, variants: { button: "sharp", card: "bordered", sidebar: "dark" }

"academic theme":
  preset: "academic", tokens: { primaryColor: "#1e3a5f", secondaryColor: "#c9a227", fontFamily: "source-serif", radius: "sm", density: "comfortable", shadow: "soft", surface: "muted" }, variants: { button: "default", card: "bordered", sidebar: "dark" }

## Priority rules:
1. Use the LAST theme the user requested — if they changed their mind ("no, i want X instead"), X wins.
2. If the user pasted a raw CSS block AND did NOT cancel it, preserve it as customCSS verbatim (strip @import lines only).
3. If the user said "you choose" / "surprise me" → output a complete set of tokens using the "minimal" preset as a sensible default.
4. Include ONLY fields that have a clear value. Do NOT invent hero text unless the conversation explicitly mentioned it.
5. Do NOT mix themes — if user ended on "claude theme", output claude theme tokens only, not mechanical.

Rules for customCSS (only when user pasted raw CSS):
- Strip @import lines
- No javascript: or expression(
- Preserve the rest exactly

Current config context:
${contextJson}`;

  const chatMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const content = await callOpenRouterChat(apiKey, systemPrompt, chatMessages, {
    temperature: 0.1,
    maxTokens: 1500,
    jsonMode: true,
  });

  try {
    const parsed = extractJsonObject(content);
    const out: OnboardingPartialConfig = {};
    const orgName =
      typeof parsed.organizationName === 'string'
        ? parsed.organizationName.trim().slice(0, 120)
        : typeof parsed.name === 'string'
          ? parsed.name.trim().slice(0, 120)
          : '';
    if (orgName) out.organizationName = orgName;

    const rawPatch = parsed.uiPatch ?? parsed;
    try {
      out.uiPatch = sanitizeUiConfigPatch(rawPatch);
    } catch {
      // partial parse - ignore invalid empty patch
    }

    const css = sanitizeCustomCss(parsed.customCSS);
    if (css) {
      out.customCSS = css;
    }
    const inferred = inferPatchFromLatestMessage(messages, context);
    return mergePartialConfigs(out, inferred);
  } catch {
    return inferPatchFromLatestMessage(messages, context);
  }
}
