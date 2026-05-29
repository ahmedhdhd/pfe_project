import { buildOpenRouterHeaders } from './openrouter';

export const ONBOARDING_TOTAL_STEPS = 9;

export const ONBOARDING_MODEL =
  process.env.OPENROUTER_ONBOARDING_MODEL?.trim() ||
  process.env.OPENROUTER_MODEL?.trim() ||
  'deepseek/deepseek-chat-v3-0324';

export interface OnboardingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OnboardingFeaturesEnabled {
  liveSessionsEnabled?: boolean;
  aiChatEnabled?: boolean;
  certificatesEnabled?: boolean;
  quizEnabled?: boolean;
  assignmentsEnabled?: boolean;
  catalogPublicEnabled?: boolean;
  qaModuleEnabled?: boolean;
  announcementsEnabled?: boolean;
}

export interface OnboardingPartialConfig {
  name?: string;
  language?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  themeColor?: string;
  featuresEnabled?: OnboardingFeaturesEnabled;
  audienceType?: string;
  platformType?: string;
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
    reply = 'Welcome! What is the name of your organisation?';
  }

  const done =
    /\b(done|ready to launch|all set|finished|that'?s everything)\b/i.test(
      reply
    );

  return { reply, done };
}

async function callOpenRouterChat(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
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
  messages: OnboardingMessage[]
): Promise<{ reply: string; done: boolean }> {
  const systemPrompt = `You are a friendly onboarding assistant for Tesla Academy (QueztLearn LMS).
Your job is to guide a new admin through setting up their learning platform via natural conversation.

Ask ONE question at a time. Be warm and concise (2-4 sentences max per reply).
Collect these topics in order (skip if already clearly answered in the conversation):
1. Organisation name
2. Platform type (LMS, training center, bootcamp, school, etc.)
3. Subject or domain (math, medicine, IT, languages, etc.)
4. Target audience (students, professionals, children, etc.)
5. Primary language (Arabic, French, English, etc.)
6. Color theme (ask them to pick or describe — suggest a hex if they describe a mood)
7. Features to enable — list all and ask which they want:
   Live sessions, AI assistant, Certificates, Quizzes, Assignments, Public catalog, Q&A module, Announcements
8. Public catalog (B2C) vs private organisation-only platform
9. Hero title and subtitle for the homepage

When listing features in step 7, show the full list clearly as bullet points.
After the hero title and subtitle are confirmed, set done to true in your JSON response.

CRITICAL: Your entire response must be a single valid JSON object with keys "reply" (string) and "done" (boolean). No markdown, no code fences, no text before or after the JSON.

Example:
{"reply":"Welcome! What is your organisation called?","done":false}

Set "done": true only when all 9 topics have clear answers (especially hero title and subtitle).`;

  const chatMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (chatMessages.length === 0) {
    chatMessages.push({
      role: 'user',
      content: 'Start the onboarding. Greet me and ask the first question.',
    });
  }

  const content = await callOpenRouterChat(apiKey, systemPrompt, chatMessages, {
    temperature: 0.45,
    maxTokens: 900,
    jsonMode: true,
  });

  return parseOnboardingChatResponse(content);
}

export async function parseOnboardingAnswer(
  apiKey: string,
  messages: OnboardingMessage[]
): Promise<OnboardingPartialConfig> {
  const systemPrompt = `Extract organisation setup data from the onboarding conversation.
Return JSON only — no markdown. Include ONLY fields that have been clearly determined so far.
Use this exact shape (omit unknown fields):
{
  "name": "string",
  "language": "string",
  "heroTitle": "string",
  "heroSubtitle": "string",
  "themeColor": "#hex",
  "featuresEnabled": {
    "liveSessionsEnabled": true,
    "aiChatEnabled": true,
    "certificatesEnabled": false,
    "quizEnabled": true,
    "assignmentsEnabled": true,
    "catalogPublicEnabled": true,
    "qaModuleEnabled": false,
    "announcementsEnabled": true
  },
  "audienceType": "string",
  "platformType": "string"
}

Rules:
- themeColor must be a valid hex like #6366f1 when mentioned
- Booleans in featuresEnabled: true only if admin explicitly wanted the feature; false if they declined; omit if not discussed yet
- catalogPublicEnabled: true for B2C/public catalog, false for private org-only
- Do not invent hero text — only include if stated in conversation`;

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
    return sanitizePartialConfig(parsed);
  } catch {
    return {};
  }
}

function optionalString(value: unknown, max: number): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s ? s.slice(0, max) : undefined;
}

function normalizeHex(value: unknown): string | undefined {
  const s = optionalString(value, 32);
  if (!s) return undefined;
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(s)) return s;
  return undefined;
}

function sanitizePartialConfig(raw: Record<string, unknown>): OnboardingPartialConfig {
  const out: OnboardingPartialConfig = {};

  const name = optionalString(raw.name, 120);
  if (name) out.name = name;
  const language = optionalString(raw.language, 40);
  if (language) out.language = language;
  const heroTitle = optionalString(raw.heroTitle, 200);
  if (heroTitle) out.heroTitle = heroTitle;
  const heroSubtitle = optionalString(raw.heroSubtitle, 400);
  if (heroSubtitle) out.heroSubtitle = heroSubtitle;
  const themeColor = normalizeHex(raw.themeColor);
  if (themeColor) out.themeColor = themeColor;
  const audienceType = optionalString(raw.audienceType, 80);
  if (audienceType) out.audienceType = audienceType;
  const platformType = optionalString(raw.platformType, 80);
  if (platformType) out.platformType = platformType;

  if (raw.featuresEnabled && typeof raw.featuresEnabled === 'object') {
    const fe = raw.featuresEnabled as Record<string, unknown>;
    const featuresEnabled: OnboardingFeaturesEnabled = {};
    const keys = [
      'liveSessionsEnabled',
      'aiChatEnabled',
      'certificatesEnabled',
      'quizEnabled',
      'assignmentsEnabled',
      'catalogPublicEnabled',
      'qaModuleEnabled',
      'announcementsEnabled',
    ] as const;
    for (const key of keys) {
      if (typeof fe[key] === 'boolean') {
        featuresEnabled[key] = fe[key];
      }
    }
    if (Object.keys(featuresEnabled).length > 0) {
      out.featuresEnabled = featuresEnabled;
    }
  }

  return out;
}

/** Map onboarding partial config → OrganizationConfig DB/API fields */
export function onboardingToOrganizationPayload(
  partial: OnboardingPartialConfig,
  organizationId: string,
  existing?: { slug?: string; name?: string }
): Record<string, unknown> {
  const primary = partial.themeColor || '#6366f1';
  const secondary = shiftHexColor(primary);

  const featuresEnabled: Record<string, boolean> = {};
  const fe = partial.featuresEnabled || {};
  if (typeof fe.liveSessionsEnabled === 'boolean') {
    featuresEnabled.liveSessions = fe.liveSessionsEnabled;
  }
  if (typeof fe.aiChatEnabled === 'boolean') {
    featuresEnabled.aiTutor = fe.aiChatEnabled;
  }
  if (typeof fe.certificatesEnabled === 'boolean') {
    featuresEnabled.certificates = fe.certificatesEnabled;
  }
  if (typeof fe.quizEnabled === 'boolean') {
    featuresEnabled.testSeries = fe.quizEnabled;
  }
  if (typeof fe.assignmentsEnabled === 'boolean') {
    featuresEnabled.assignments = fe.assignmentsEnabled;
  }
  if (typeof fe.announcementsEnabled === 'boolean') {
    featuresEnabled.announcements = fe.announcementsEnabled;
  }
  if (typeof fe.qaModuleEnabled === 'boolean') {
    featuresEnabled.qaModule = fe.qaModuleEnabled;
  }
  if (typeof fe.catalogPublicEnabled === 'boolean') {
    featuresEnabled.courses = true;
  }

  const payload: Record<string, unknown> = {
    organizationId,
    name: partial.name || existing?.name || 'My Academy',
    slug: existing?.slug || 'academy',
    themeColor: primary,
    theme: { primaryColor: primary, secondaryColor: secondary },
    language: partial.language,
    audienceType: partial.audienceType,
    platformType: partial.platformType,
    heroTitle: partial.heroTitle,
    heroSubtitle: partial.heroSubtitle,
    ctaText: 'Get Started',
    ctaUrl: '/login',
    featuresEnabled,
    paymentMode: fe.catalogPublicEnabled === false ? 'free' : 'per_course',
  };

  if (partial.platformType || partial.audienceType) {
    payload.description = [
      partial.platformType && `${partial.platformType} platform`,
      partial.audienceType && `for ${partial.audienceType}`,
      partial.language && `in ${partial.language}`,
    ]
      .filter(Boolean)
      .join(' ');
  }

  return payload;
}

function shiftHexColor(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#ec4899';
  const r = Math.min(255, parseInt(h.slice(0, 2), 16) + 30);
  const g = Math.min(255, parseInt(h.slice(2, 4), 16) + 20);
  const b = Math.min(255, parseInt(h.slice(4, 6), 16) + 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function countOnboardingProgress(partial: OnboardingPartialConfig): number {
  let n = 0;
  if (partial.name) n++;
  if (partial.platformType) n++;
  if (partial.audienceType) n++; // domain often in platformType/audience - also check language
  if (partial.language) n++;
  if (partial.themeColor) n++;
  if (partial.featuresEnabled && Object.keys(partial.featuresEnabled).length >= 3) n++;
  if (partial.featuresEnabled && typeof partial.featuresEnabled.catalogPublicEnabled === 'boolean') n++;
  if (partial.heroTitle) n++;
  if (partial.heroSubtitle) n++;
  return Math.min(n, ONBOARDING_TOTAL_STEPS);
}
