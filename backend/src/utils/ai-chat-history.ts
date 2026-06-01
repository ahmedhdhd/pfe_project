const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;

export type ChatHistoryMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Sanitize client-provided chat history before sending to the LLM.
 */
export function sanitizeChatHistory(
  history: unknown
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const role = (entry as { role?: string }).role === 'assistant' ? 'assistant' : 'user';
      const raw = (entry as { content?: unknown }).content;
      const content =
        typeof raw === 'string'
          ? raw.slice(0, MAX_MESSAGE_CHARS).trim() || '(no text)'
          : '(no text)';
      return { role, content };
    })
    .filter((entry): entry is ChatHistoryMessage => entry !== null);
}
