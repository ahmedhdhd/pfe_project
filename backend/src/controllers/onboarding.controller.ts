import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  runOnboardingChat,
  parseOnboardingAnswer,
  type OnboardingMessage,
} from '../utils/onboarding-ai';

async function resolveOpenRouterKey(organizationId: string): Promise<string> {
  const orgAiConfig = await prisma.organizationConfig.findUnique({
    where: { organizationId },
    select: { openRouterApiKey: true },
  });
  return (
    orgAiConfig?.openRouterApiKey?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim() ||
    ''
  );
}

function normalizeMessages(raw: unknown): OnboardingMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m === 'object')
    .map((m) => {
      const item = m as Record<string, unknown>;
      const role = item.role === 'assistant' ? 'assistant' : 'user';
      const content = String(item.content || '').trim();
      return { role, content } as OnboardingMessage;
    })
    .filter((m) => m.content.length > 0);
}

export const onboardingChat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId =
      (typeof req.body?.organizationId === 'string' && req.body.organizationId) ||
      req.user!.organizationId;

    if (organizationId !== req.user!.organizationId) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    const messages = normalizeMessages(req.body?.messages);
    const apiKey = await resolveOpenRouterKey(organizationId);
    if (!apiKey) {
      sendError(
        res,
        'OpenRouter API key is not configured. Add it in Admin → Settings → AI, or set OPENROUTER_API_KEY.',
        400
      );
      return;
    }

    const result = await runOnboardingChat(apiKey, messages);
    sendSuccess(res, result);
  } catch (e) {
    next(e);
  }
};

export const parseOnboardingAnswerHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId =
      (typeof req.body?.organizationId === 'string' && req.body.organizationId) ||
      req.user!.organizationId;

    if (organizationId !== req.user!.organizationId) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    const messages = normalizeMessages(req.body?.messages);
    if (messages.length === 0) {
      sendSuccess(res, {});
      return;
    }

    const apiKey = await resolveOpenRouterKey(organizationId);
    if (!apiKey) {
      sendError(res, 'OpenRouter API key is not configured', 400);
      return;
    }

    const partial = await parseOnboardingAnswer(apiKey, messages);
    sendSuccess(res, partial);
  } catch (e) {
    next(e);
  }
};
