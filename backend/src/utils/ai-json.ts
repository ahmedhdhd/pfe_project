import { buildOpenRouterHeaders } from './openrouter';

export const extractJsonObject = (text: string): Record<string, unknown> => {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain JSON');
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
};

export interface OpenRouterChatJsonOptions {
  apiKey: string;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * OpenRouter chat completion with JSON response format when supported.
 */
export async function openRouterChatJson(
  options: OpenRouterChatJsonOptions
): Promise<Record<string, unknown>> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: buildOpenRouterHeaders(options.apiKey),
    body: JSON.stringify({
      model: options.model,
      messages: [{ role: 'user', content: options.prompt }],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status}): ${raw.slice(0, 400)}`);
  }

  const payload = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim() || '';
  if (!content) {
    throw new Error('OpenRouter returned an empty response');
  }
  return extractJsonObject(content);
}
