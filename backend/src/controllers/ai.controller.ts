import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { SystemPromptContext } from '../types/ai-context';
import { sanitizeChatHistory } from '../utils/ai-chat-history';
import { aiService, AiServiceError } from '../utils/ai-service-client';
import { ensureBatchReadAccess } from './misc.helpers';

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

    if (!(await ensureBatchReadAccess(req, res, context.batchId))) {
      return;
    }

    const userId = req.user!.userId;
    const sanitizedHistory = sanitizeChatHistory(history);
    const orgId = req.user!.organizationId;
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

    let chatResult: { replyText: string; ragChunksUsed?: number; ragStatus?: string };
    try {
      chatResult = await aiService.chat({
        organizationId: orgId,
        message,
        history: sanitizedHistory,
        promptContext: promptCtx as unknown as Record<string, unknown>,
        batchId: context.batchId,
      });
    } catch (error: any) {
      if (error instanceof AiServiceError) {
        sendError(res, error.message.slice(0, 800), error.statusCode);
        return;
      }
      throw error;
    }

    const replyText = chatResult.replyText?.trim() || '';
    if (!replyText) {
      sendError(res, 'AI service returned an empty reply.', 502);
      return;
    }

    const debugRag =
      process.env.NODE_ENV === 'development'
        ? {
            ragChunksUsed: chatResult.ragChunksUsed ?? 0,
            ragStatus: chatResult.ragStatus ?? 'no_chunks',
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

    if (!(await ensureBatchReadAccess(req, res, batchId))) {
      return;
    }

    let html: string;
    try {
      const generated = await aiService.generatePlayground({
        organizationId: orgId,
        concept,
        instruction: userPrompt || `Visualize the concept of ${concept} interactively`,
        batchName: batch.name,
        exam: batch.exam,
        language: batch.language,
      });
      html = generated.html;
    } catch (error: any) {
      if (error instanceof AiServiceError) {
        sendError(res, error.message.slice(0, 800), error.statusCode);
        return;
      }
      throw error;
    }

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
    if (!(await ensureBatchReadAccess(req, res, playground.batchId))) return;
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

export const publishPlaygroundToTopic = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgId = req.user!.organizationId;
    const { topicId, title, description } = req.body as {
      topicId?: string;
      title?: string;
      description?: string;
    };

    if (!topicId || !title?.trim()) {
      sendError(res, 'topicId and title are required', 400);
      return;
    }

    const playground = await prisma.aiPlayground.findFirst({
      where: { id: req.params.id, orgId },
      select: {
        id: true,
        batchId: true,
        topicId: true,
        contentId: true,
      },
    });
    if (!playground) {
      sendError(res, 'Playground not found', 404);
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { chapter: { include: { subject: { select: { batchId: true } } } } },
    });
    if (!topic || topic.chapter.subject.batchId !== playground.batchId) {
      sendError(res, 'Topic not found in this course', 404);
      return;
    }

    const content = await prisma.$transaction(async (tx) => {
      if (playground.contentId) {
        const existingContent = await tx.content.findUnique({
          where: { id: playground.contentId },
          select: {
            id: true,
            type: true,
            playgroundId: true,
          },
        });

        if (
          existingContent &&
          existingContent.type === 'PLAYGROUND' &&
          existingContent.playgroundId === playground.id
        ) {
          const updated = await tx.content.update({
            where: { id: playground.contentId },
            data: {
              topicId,
              title: title.trim(),
              description: description?.trim() || null,
              type: 'PLAYGROUND',
              playgroundId: playground.id,
            },
          });

          await tx.aiPlayground.update({
            where: { id: playground.id },
            data: {
              topicId,
              title: title.trim(),
              contentId: updated.id,
            },
          });

          return updated;
        }
      }

      const lastContent = await tx.content.findFirst({
        where: { topicId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });

      const created = await tx.content.create({
        data: {
          topicId,
          title: title.trim(),
          description: description?.trim() || null,
          type: 'PLAYGROUND',
          playgroundId: playground.id,
          order: (lastContent?.order ?? -1) + 1,
        },
      });

      await tx.aiPlayground.update({
        where: { id: playground.id },
        data: {
          topicId,
          title: title.trim(),
          contentId: created.id,
        },
      });

      return created;
    });

    sendSuccess(res, { content });
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

    if (!(await ensureBatchReadAccess(req, res, batchId))) {
      return;
    }

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
      testEmbeddings?: boolean;
    };

    if (!apiKey?.trim()) {
      sendError(res, 'apiKey is required', 400);
      return;
    }

    const result = await aiService.testOpenRouterKey({
      apiKey: apiKey.trim(),
      model: model?.trim(),
      testEmbeddings: !!testEmbeddings,
    });
    sendSuccess(res, result);
  } catch (error: any) {
    if (error instanceof AiServiceError) {
      sendError(res, error.message.slice(0, 800), error.statusCode);
      return;
    }
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
    const health = await aiService.embeddingHealth();
    sendSuccess(res, health);
  } catch (error: any) {
    if (error instanceof AiServiceError) {
      sendError(res, error.message.slice(0, 800), error.statusCode);
      return;
    }
    next(error);
  }
};
