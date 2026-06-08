import { logger } from './logger';

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const AI_SERVICE_INTERNAL_TOKEN = process.env.AI_SERVICE_INTERNAL_TOKEN?.trim() || '';

export class AiServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AiServiceError';
    this.statusCode = statusCode;
  }
}

async function aiServiceRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  if (!AI_SERVICE_INTERNAL_TOKEN) {
    throw new AiServiceError(
      'AI_SERVICE_INTERNAL_TOKEN is not configured on the backend',
      503
    );
  }

  const method = options.method || (options.body ? 'POST' : 'GET');
  const url = `${AI_SERVICE_URL}/internal/v1${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': AI_SERVICE_INTERNAL_TOKEN,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error: any) {
    logger.error(`AI service unreachable at ${url}: ${error?.message || String(error)}`);
    throw new AiServiceError(
      `AI service is unavailable. Start ai-service on ${AI_SERVICE_URL}.`,
      503
    );
  }

  const raw = await response.text();
  let payload: any = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { detail: raw };
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload?.detail === 'string'
        ? payload.detail
        : Array.isArray(payload?.detail)
          ? payload.detail.map((d: any) => d?.msg || String(d)).join('; ')
          : payload?.message || response.statusText;
    throw new AiServiceError(detail || 'AI service request failed', response.status);
  }

  return payload as T;
}

async function aiServiceMultipartRequest<T>(
  path: string,
  formData: FormData
): Promise<T> {
  if (!AI_SERVICE_INTERNAL_TOKEN) {
    throw new AiServiceError(
      'AI_SERVICE_INTERNAL_TOKEN is not configured on the backend',
      503
    );
  }

  const url = `${AI_SERVICE_URL}/internal/v1${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Internal-Token': AI_SERVICE_INTERNAL_TOKEN,
      },
      body: formData,
    });
  } catch (error: any) {
    logger.error(`AI service unreachable at ${url}: ${error?.message || String(error)}`);
    throw new AiServiceError(
      `AI service is unavailable. Start ai-service on ${AI_SERVICE_URL}.`,
      503
    );
  }

  const raw = await response.text();
  let payload: any = {};
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { detail: raw };
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload?.detail === 'string'
        ? payload.detail
        : payload?.message || response.statusText;
    throw new AiServiceError(detail || 'AI service request failed', response.status);
  }

  return payload as T;
}

export const aiService = {
  health: () => aiServiceRequest<{ status: string }>('/health'),

  chat: (body: {
    organizationId: string;
    message: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    promptContext: Record<string, unknown>;
    batchId: string;
  }) =>
    aiServiceRequest<{
      replyText: string;
      ragChunksUsed?: number;
      ragStatus?: string;
    }>('/chat', { body }),

  generatePlayground: (body: {
    organizationId: string;
    concept: string;
    instruction: string;
    batchName: string;
    exam?: string | null;
    language?: string | null;
  }) => aiServiceRequest<{ html: string }>('/playground/generate', { body }),

  generateTheme: (body: {
    organizationId: string;
    organizationName?: string;
    description: string;
    currentCustomCss?: string;
  }) =>
    aiServiceRequest<{
      themeName: string;
      summary: string;
      theme: {
        primaryColor: string;
        secondaryColor: string;
        fontFamily: string;
      };
      customCss: string;
    }>('/theme/generate', { body }),

  indexContent: (body: {
    contentId: string;
    batchId: string;
    organizationId: string;
  }) => aiServiceRequest<{ accepted: boolean }>('/content/index', { body }),

  deleteEmbeddings: (contentId: string) =>
    aiServiceRequest<{ deleted: boolean }>(`/content/${contentId}/embeddings`, {
      method: 'DELETE',
    }),

  assignmentFeedback: (body: { organizationId: string; prompt: string }) =>
    aiServiceRequest<Record<string, unknown>>('/assignments/feedback', { body }),

  assignmentGenerateQuestions: (body: {
    organizationId: string;
    generationPrompt: string;
  }) => aiServiceRequest<Record<string, unknown>>('/assignments/generate-questions', { body }),

  summarizeSchedule: (body: {
    organizationId: string;
    title: string;
    transcript: string;
  }) => aiServiceRequest<{ summary: string }>('/schedules/summarize', { body }),

  testOpenRouterKey: (body: {
    apiKey: string;
    model?: string;
    testEmbeddings?: boolean;
  }) =>
    aiServiceRequest<{ valid: boolean; message: string }>('/admin/test-openrouter-key', {
      body,
    }),

  embeddingHealth: () =>
    aiServiceRequest<{
      totalContentCount: number;
      contentWithExtractedTextCount: number;
      contentWithEmbeddingsCount: number;
      contentWithoutExtractedText: Array<{
        id: string;
        title: string;
        type: string;
        topicId: string;
      }>;
    }>('/admin/embedding-health'),

  transcribeLocalMedia: (fileBuffer: Buffer, filename: string) => {
    const form = new FormData();
    const bytes = new Uint8Array(fileBuffer);
    form.append(
      'file',
      new Blob([bytes], { type: 'application/octet-stream' }),
      filename || 'chunk.webm'
    );
    return aiServiceMultipartRequest<{ text: string }>('/transcription/local-media', form);
  },
};
