import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  buildSystemPromptWithRAG,
  SystemPromptContext,
} from '../utils/ai-prompts';
import {
  generateEmbedding,
  searchSimilarChunks,
} from '../utils/embeddings';
import { buildOpenRouterHeaders } from '../utils/openrouter';
import { generatePlaygroundHtmlOpenRouter } from '../utils/openrouter-playground';

const TEMP_PLAYGROUND_ID_PREFIX = 'temp-playground-';

function isTemporaryPlaygroundId(id?: string | null): boolean {
  return !!id && id.startsWith(TEMP_PLAYGROUND_ID_PREFIX);
}

function createTemporaryPlayground(params: {
  id?: string;
  concept: string;
  refinements: number;
}) {
  return {
    id: params.id || `${TEMP_PLAYGROUND_ID_PREFIX}${Date.now()}`,
    concept: params.concept,
    refinements: params.refinements,
  };
}

// ── POST /api/ai/chat (non-agentic with RAG) ─────────────────────────────────

export const aiChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { message, history, context } = req.body as {
      message: string;
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
      context: {
        batchId: string;
        chapterId: string;
        topicId: string;
        contentId: string;
      };
    };

    if (!message || !context?.batchId || !context?.contentId) {
      sendError(res, 'message and context (batchId, contentId) are required', 400);
      return;
    }

    const userId = req.user!.userId;
    const orgId = req.user!.organizationId;
    const openRouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324';

    const orgAiConfig = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
      select: { openRouterApiKey: true },
    });

    const openRouterApiKey =
      orgAiConfig?.openRouterApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';

    if (!openRouterApiKey) {
      sendError(
        res,
        'OpenRouter API key is not configured. Add it in Admin → Settings → AI, or set OPENROUTER_API_KEY in the backend environment.',
        400
      );
      return;
    }

    // 1. Fetch batch and student context
    const [batch, student] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: context.batchId },
        select: { name: true, exam: true, class: true, language: true, description: true, introVideoUrl: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      }),
    ]);

    if (!batch) {
      sendError(res, 'Course not found', 404);
      return;
    }

    let chapter: any = null;
    let topic: any = null;
    let content: any = null;

    if (context.contentId === 'course-introduction') {
      content = {
        title: 'Course Introduction',
        type: 'Lecture',
        description: batch.description,
        extractedText: null,
        markdownBody: null,
        externalUrl: null,
        videoUrl: batch.introVideoUrl,
      };
      chapter = { name: 'Course', order: 0, subject: { chapters: [] } };
      topic = { name: 'Introduction', chapter: { topics: [] } };
    } else {
      if (!context.chapterId || !context.topicId) {
        sendError(res, 'chapterId and topicId are required for regular content', 400);
        return;
      }
      [chapter, topic, content] = await Promise.all([
        (prisma as any).chapter.findUnique({
          where: { id: context.chapterId },
          select: {
            name: true,
            order: true,
            subject: {
              select: {
                chapters: { select: { name: true }, orderBy: { order: 'asc' } },
              },
            },
          },
        }),
        (prisma as any).topic.findUnique({
          where: { id: context.topicId },
          select: {
            name: true,
            chapter: {
              select: {
                topics: {
                  select: { name: true },
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        }),
        (prisma as any).content.findUnique({
          where: { id: context.contentId },
          select: {
            title: true,
            type: true,
            description: true,
            extractedText: true,
            markdownBody: true,
            externalUrl: true,
            videoUrl: true,
          },
        }),
      ]);

      if (!chapter || !topic || !content) {
        sendError(res, 'Course context not found', 404);
        return;
      }
    }

    const allChapters: Array<{ title: string }> = (chapter.subject?.chapters || []).map(
      (c: any) => ({ title: c.name })
    );
    const siblingTopics: Array<{ title: string; description?: string | null }> = (
      topic.chapter?.topics || []
    ).map((t: any) => ({ title: t.name, description: t.description }));

    const promptCtx: SystemPromptContext = {
      batch: { name: batch.name, exam: batch.exam, class: batch.class, language: batch.language },
      chapter: { title: chapter.name, order: chapter.order, totalChapters: allChapters.length },
      topic: { title: topic.name },
      content: {
        title: content.title,
        type: content.type,
        description: content.description,
        extractedText: (content as any).extractedText,
        markdownBody: (content as any).markdownBody,
        externalUrl: (content as any).externalUrl,
        videoUrl: (content as any).videoUrl,
      },
      siblingTopics,
      allChapters,
      student: { firstName: student?.username?.split(' ')[0] || 'Student' },
    };

    // 2. RAG: same OpenRouter key + embedding model as content indexing
    let retrievedChunks: Array<{ chunk_text: string; similarity: number; metadata: any }> = [];
    try {
      const queryEmbedding = await generateEmbedding(message, openRouterApiKey);
      retrievedChunks = await searchSimilarChunks(queryEmbedding, context.batchId, 5);
    } catch (ragError: any) {
      console.warn(`RAG retrieval failed: ${ragError.message}`);
    }

    // 3. Build system prompt WITH retrieved context
    const systemPrompt = buildSystemPromptWithRAG(promptCtx, retrievedChunks);

    // 4. DeepSeek (or any OpenRouter chat model)
    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content || '(no text)',
      })),
      { role: 'user', content: message },
    ];

    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: buildOpenRouterHeaders(openRouterApiKey),
      body: JSON.stringify({
        model: openRouterModel,
        messages: openRouterMessages,
        temperature: 0.3,
      }),
    });

    if (!openRouterResponse.ok) {
      const openRouterErr = await openRouterResponse.text();
      sendError(
        res,
        `OpenRouter request failed (${openRouterResponse.status}): ${openRouterErr.slice(0, 800)}`,
        502
      );
      return;
    }

    const openRouterPayload = (await openRouterResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const replyText = openRouterPayload?.choices?.[0]?.message?.content?.trim() || '';
    if (!replyText) {
      sendError(
        res,
        'OpenRouter returned an empty reply. Set OPENROUTER_MODEL (e.g. deepseek/deepseek-chat-v3-0324) or check the API response.',
        502
      );
      return;
    }

    const debugRag =
      process.env.NODE_ENV === 'development'
        ? {
            ragChunksUsed: retrievedChunks.length,
            ragStatus: retrievedChunks.length > 0 ? 'ok' : 'no_chunks',
          }
        : {};

    let linkedPlayground: { concept: string; generatedHtml: string } | null = null;
    if (context.contentId && context.contentId !== 'course-introduction') {
      linkedPlayground = await prisma.aiPlayground.findFirst({
        where: {
          batchId: context.batchId,
          OR: [
            { contentId: context.contentId },
            ...(context.topicId
              ? [{ topicId: context.topicId, contentId: null }]
              : []),
          ],
        },
        orderBy: { updatedAt: 'desc' },
        select: { concept: true, generatedHtml: true },
      });
    }

    const wantsInteractiveWidget =
      /\b(playground|interactive|visuali[sz]e|simulation|widget|démo|demo)\b/i.test(
        message
      );

    const includePlayground = !!linkedPlayground && wantsInteractiveWidget;

    sendSuccess(res, {
      reply: {
        type: includePlayground ? 'mixed' : 'text',
        text: replyText,
        ...(includePlayground && linkedPlayground
          ? {
              playground: {
                concept: linkedPlayground.concept,
                html: linkedPlayground.generatedHtml,
              },
            }
          : {}),
      },
      ...debugRag,
    });
  } catch (e: any) {
    console.error('aiChat error:', e);
    const errorMessage = String(e?.message || '');

    if (
      e?.status === 429 ||
      errorMessage.includes('429 Too Many Requests') ||
      errorMessage.toLowerCase().includes('quota') ||
      errorMessage.includes('rate limit')
    ) {
      sendError(
        res,
        'AI quota or rate limit exceeded for OpenRouter. Add credits, wait, or use another key, then try again.',
        429
      );
      return;
    }

    if (errorMessage.includes('OpenRouter')) {
      sendError(res, errorMessage.slice(0, 800), 502);
      return;
    }

    sendError(
      res,
      process.env.NODE_ENV === 'development'
        ? `AI chat failed: ${errorMessage.slice(0, 500)}`
        : 'AI chat failed. Please try again in a moment.',
      500
    );
  }
};

// ── POST /api/ai/playground/generate (teacher) ───────────────────────────────

export const teacherGeneratePlayground = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      prompt: userPrompt,
      concept,
      batchId,
      topicId,
      contentId,
      refineFromId,
      refinementCount,
    } = req.body as {
      prompt: string;
      concept: string;
      batchId: string;
      topicId?: string;
      contentId?: string;
      refineFromId?: string;
      refinementCount?: number;
    };

    if (!concept || !batchId) {
      sendError(res, 'concept and batchId are required', 400);
      return;
    }

    const userId = req.user!.userId;
    const orgId = req.user!.organizationId;
    const isTempRefinement = isTemporaryPlaygroundId(refineFromId);
    const baseRefinementCount =
      typeof refinementCount === 'number' && Number.isFinite(refinementCount)
        ? refinementCount
        : 0;

    // Check refinement limit
    if (refineFromId) {
      if (isTempRefinement) {
        if (baseRefinementCount >= 10) {
          sendError(res, 'Maximum refinements (10) reached. Please start a new playground.', 400);
          return;
        }
      } else {
        const existing = await prisma.aiPlayground.findFirst({
          where: { id: refineFromId, orgId, batchId },
        });
        if (!existing) {
          sendError(res, 'Playground not found', 404);
          return;
        }
        if (existing.refinements >= 10) {
          sendError(res, 'Maximum refinements (10) reached. Please start a new playground.', 400);
          return;
        }
      }
    }

    const batch = await prisma.batch.findFirst({
      where: { id: batchId, organizationId: orgId },
      select: { name: true, exam: true, language: true },
    });
    if (!batch) {
      sendError(res, 'Course not found', 404);
      return;
    }

    const orgCfg = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
      select: { openRouterApiKey: true },
    });
    const orKey = orgCfg?.openRouterApiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim() || '';
    if (!orKey) {
      sendError(res, 'OpenRouter API key is not configured for AI playground generation.', 400);
      return;
    }

    const html = await generatePlaygroundHtmlOpenRouter(orKey, {
      concept,
      instruction: userPrompt || `Visualize the concept of ${concept} interactively`,
      complexity: 'detailed',
      batchName: batch.name,
      exam: batch.exam,
      language: batch.language,
    });

    const fallbackRefinementCount = refineFromId
      ? Math.min(baseRefinementCount + 1, 10)
      : 0;

    let playground: { id: string; concept: string; refinements: number };
    try {
      if (refineFromId && !isTempRefinement) {
        const updated = await prisma.aiPlayground.update({
          where: { id: refineFromId },
          data: {
            generatedHtml: html,
            promptUsed: userPrompt || '',
            concept,
            title: concept,
            refinements: { increment: 1 },
          },
        });
        playground = {
          id: updated.id,
          concept: updated.concept,
          refinements: updated.refinements,
        };
      } else {
        const created = await prisma.aiPlayground.create({
          data: {
            orgId,
            batchId,
            topicId: topicId || null,
            contentId: contentId || null,
            title: concept,
            concept,
            generatedHtml: html,
            promptUsed: userPrompt || '',
            createdBy: userId,
            createdByRole: 'TEACHER',
            refinements: isTempRefinement ? fallbackRefinementCount : 0,
          },
        });
        playground = {
          id: created.id,
          concept: created.concept,
          refinements: created.refinements,
        };
      }
    } catch (persistError) {
      const message =
        persistError instanceof Prisma.PrismaClientKnownRequestError
          ? `Database error (${persistError.code}): ${persistError.message}`
          : persistError instanceof Error
            ? persistError.message
            : String(persistError);
      logger.error(`teacherGeneratePlayground persistence failed: ${message}`);
      sendError(
        res,
        `Playground was generated but could not be saved. Run database migrations (ai_playgrounds table). Details: ${message.slice(0, 300)}`,
        500
      );
      return;
    }

    sendSuccess(res, {
      playground: {
        id: playground.id,
        html,
        concept: playground.concept,
        refinements: playground.refinements,
        topicId: topicId || null,
        contentId: contentId || null,
      },
    });
  } catch (e: any) {
    const errorMessage = String(e?.message || '');
    if (errorMessage.includes('OpenRouter')) {
      sendError(res, errorMessage.slice(0, 800), 502);
      return;
    }
    next(e);
  }
};

export const getPlaygroundById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.user!.organizationId;
    const playground = await prisma.aiPlayground.findFirst({
      where: { id: req.params.id, orgId },
      select: {
        id: true,
        title: true,
        concept: true,
        generatedHtml: true,
        refinements: true,
        topicId: true,
        contentId: true,
        batchId: true,
        createdAt: true,
      },
    });
    if (!playground) {
      sendError(res, 'Playground not found', 404);
      return;
    }
    sendSuccess(res, {
      playground: {
        id: playground.id,
        title: playground.title,
        concept: playground.concept,
        html: playground.generatedHtml,
        refinements: playground.refinements,
        topicId: playground.topicId,
        contentId: playground.contentId,
        batchId: playground.batchId,
        createdAt: playground.createdAt,
      },
    });
  } catch (e) {
    next(e);
  }
};

// ── GET /api/ai/playgrounds/:batchId ─────────────────────────────────────────

export const listBatchPlaygrounds = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const orgId = req.user!.organizationId;
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, organizationId: orgId },
      select: { id: true },
    });
    if (!batch) {
      sendError(res, 'Course not found', 404);
      return;
    }
    const playgrounds = await prisma.aiPlayground.findMany({
      where: { batchId, orgId },
      select: {
        id: true,
        title: true,
        concept: true,
        createdByRole: true,
        refinements: true,
        createdAt: true,
        topicId: true,
        contentId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, playgrounds);
  } catch (e) {
    next(e);
  }
};

// ── GET /api/ai/weak-concepts/:batchId ───────────────────────────────────────

export const getWeakConcepts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params;

    // Group by concept and count students
    const flags = await (prisma as any).weakConceptFlag.groupBy({
      by: ['concept', 'suggestedReviewTopic'],
      where: { batchId },
      _count: { studentId: true },
      orderBy: { _count: { studentId: 'desc' } },
    });

    const result = flags.map((f: any) => ({
      concept: f.concept,
      suggestedReviewTopic: f.suggestedReviewTopic,
      studentCount: f._count.studentId,
    }));

    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
};

// ── POST /api/ai/test-openrouter-key ─────────────────────────────────────────
export const testOpenRouterApiKey = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { apiKey, model, testEmbeddings } = req.body as {
      apiKey: string;
      model?: string;
      /** Also verify embedding API (RAG) with OPENROUTER_EMBEDDING_MODEL */
      testEmbeddings?: boolean;
    };
    const testModel = model?.trim() || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324';

    if (!apiKey?.trim()) {
      sendError(res, 'apiKey is required', 400);
      return;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: buildOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      sendError(res, `Invalid OpenRouter API key or model: ${errText}`, 400);
      return;
    }

    if (testEmbeddings) {
      try {
        await generateEmbedding('test', apiKey.trim());
      } catch (embedErr: any) {
        sendError(
          res,
          `Chat OK but embeddings (RAG) failed: ${embedErr?.message || embedErr}. Check OPENROUTER_EMBEDDING_MODEL.`,
          400
        );
        return;
      }
    }

    sendSuccess(res, {
      valid: true,
      message: testEmbeddings
        ? 'OpenRouter chat and embeddings API are working.'
        : 'OpenRouter API key is valid for chat.',
    });
  } catch (error: any) {
    sendError(res, `Invalid OpenRouter API key: ${error.message}`, 400);
  }
};

// ── GET /api/ai/embedding-health ──────────────────────────────────────────────
export const getEmbeddingHealth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalContentCount,
      contentWithExtractedTextCount,
      contentWithoutExtractedText,
      embeddedContentCountRows,
    ] = await Promise.all([
      prisma.content.count(),
      prisma.content.count({
        where: {
          extractedText: {
            not: '',
          },
        },
      }),
      prisma.content.findMany({
        where: {
          OR: [{ extractedText: null }, { extractedText: '' }],
        },
        select: {
          id: true,
          title: true,
          type: true,
          topicId: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.$queryRawUnsafe<Array<{ count: string | number }>>(
        `SELECT COUNT(DISTINCT content_id) AS count FROM content_embeddings`
      ),
    ]);

    const contentWithEmbeddingsCount = Number(embeddedContentCountRows?.[0]?.count ?? 0);

    sendSuccess(res, {
      totalContentCount,
      contentWithExtractedTextCount,
      contentWithEmbeddingsCount,
      contentWithoutExtractedText,
    });
  } catch (e) {
    next(e);
  }
};
