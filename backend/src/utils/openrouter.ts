/**
 * OpenRouter recommends these headers for API access and rankings.
 * @see https://openrouter.ai/docs
 */
export function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    'http://localhost:3000';
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || 'QuetzLearn LMS';
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': referer,
    'X-Title': title,
  };
}
