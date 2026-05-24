import { Request, Response, NextFunction } from 'express';
import { ContentType, Prisma, VideoType } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { extractAndEmbed, deleteContentEmbeddings } from '../utils/embeddings';

type ContentTypeValue = ContentType;
type StoredVideoType = VideoType;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const toOptionalString = (value: unknown): string | undefined =>
  isNonEmptyString(value) ? value.trim() : undefined;

const normalizeExternalUrl = (value?: string): string | undefined => {
  if (!value) return undefined;

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  return `https://${value}`;
};

const isValidHttpUrl = (value?: string): boolean => {
  if (!value) return false;

  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
};

const isYouTubeUrl = (value?: string): boolean =>
  !!value && /youtu\.be|youtube\.com/i.test(value);

const isHlsUrl = (value?: string): boolean =>
  !!value && /\.m3u8($|[?#])/i.test(value);

const resolveStoredVideoType = (
  rawVideoType: unknown,
  videoUrl?: string
): StoredVideoType | undefined => {
  if (isYouTubeUrl(videoUrl)) return VideoType.YOUTUBE;
  if (isHlsUrl(videoUrl)) return VideoType.HLS;

  const normalized = toOptionalString(rawVideoType)?.toUpperCase();

  if (normalized === VideoType.YOUTUBE) return VideoType.YOUTUBE;

  return undefined;
};

const normalizeContentPayload = (body: Record<string, unknown>) => {
  const rawType = toOptionalString(body.type);
  const type =
    rawType === ContentType.Lecture ||
    rawType === ContentType.PDF ||
    rawType === ContentType.MARKDOWN ||
    rawType === ContentType.URL ||
    rawType === ContentType.PLAYGROUND
      ? (rawType as ContentTypeValue)
      : undefined;
  const title = toOptionalString(body.title) || toOptionalString(body.name);
  const description = toOptionalString(body.description);
  const extractedText = toOptionalString(body.extractedText);
  const topicId = toOptionalString(body.topicId);
  const pdfUrl = toOptionalString(body.pdfUrl);
  const markdownBody = toOptionalString(body.markdownBody);
  const externalUrl = normalizeExternalUrl(toOptionalString(body.externalUrl));
  const externalProvider = toOptionalString(body.externalProvider);
  const playgroundId = toOptionalString(body.playgroundId);
  const videoUrl = toOptionalString(body.videoUrl);
  const videoThumbnail = toOptionalString(body.videoThumbnail);
  const rawDuration = body.videoDuration;

  const videoDuration =
    typeof rawDuration === 'number'
      ? rawDuration
      : typeof rawDuration === 'string' && rawDuration.trim() !== ''
      ? Number(rawDuration)
      : undefined;

  return {
    topicId,
    title,
    description,
    extractedText,
    type,
    pdfUrl: type === 'PDF' ? pdfUrl : undefined,
    markdownBody: type === ContentType.MARKDOWN ? markdownBody : undefined,
    externalUrl: type === ContentType.URL ? externalUrl : undefined,
    externalProvider: type === ContentType.URL ? externalProvider : undefined,
    playgroundId: type === ContentType.PLAYGROUND ? playgroundId : undefined,
    videoUrl: type === 'Lecture' ? videoUrl : undefined,
    videoType:
      type === 'Lecture'
        ? resolveStoredVideoType(body.videoType, videoUrl)
        : undefined,
    videoThumbnail: type === 'Lecture' ? videoThumbnail : undefined,
    videoDuration:
      type === 'Lecture' &&
      typeof videoDuration === 'number' &&
      Number.isFinite(videoDuration)
        ? videoDuration
        : undefined,
  };
};

const validateContentPayload = (
  payload: ReturnType<typeof normalizeContentPayload>
): string | null => {
  if (!payload.topicId) return 'topicId is required';
  if (!payload.title) return 'title is required';
  if (
    payload.type !== ContentType.Lecture &&
    payload.type !== ContentType.PDF &&
    payload.type !== ContentType.MARKDOWN &&
    payload.type !== ContentType.URL &&
    payload.type !== ContentType.PLAYGROUND
  ) {
    return 'type must be Lecture, PDF, MARKDOWN, URL, or PLAYGROUND';
  }

  if (payload.type === ContentType.Lecture) {
    if (!payload.videoUrl) return 'videoUrl is required for lecture content';
  }

  if (payload.type === ContentType.PDF && !payload.pdfUrl) {
    return 'pdfUrl is required for PDF content';
  }

  if (payload.type === ContentType.MARKDOWN && !payload.markdownBody) {
    return 'markdownBody is required for Markdown content';
  }

  if (payload.type === ContentType.URL && !payload.externalUrl) {
    return 'externalUrl is required for URL content';
  }

  if (payload.type === ContentType.URL && !isValidHttpUrl(payload.externalUrl)) {
    return 'externalUrl must be a valid http(s) URL';
  }

  if (payload.type === ContentType.PLAYGROUND && !payload.playgroundId) {
    return 'playgroundId is required for PLAYGROUND content';
  }

  return null;
};

const buildCreateData = (
  payload: ReturnType<typeof normalizeContentPayload>
): Record<string, unknown> => ({
  topicId: payload.topicId!,
  title: payload.title!,
  description: payload.description ?? null,
  extractedText: payload.extractedText ?? null,
  type: payload.type!,
  ...(payload.pdfUrl ? { pdfUrl: payload.pdfUrl } : {}),
  ...(payload.markdownBody ? { markdownBody: payload.markdownBody } : {}),
  ...(payload.externalUrl ? { externalUrl: payload.externalUrl } : {}),
  ...(payload.externalProvider ? { externalProvider: payload.externalProvider } : {}),
  ...(payload.playgroundId ? { playgroundId: payload.playgroundId } : {}),
  ...(payload.videoUrl ? { videoUrl: payload.videoUrl } : {}),
  ...(payload.videoType ? { videoType: payload.videoType } : {}),
  ...(payload.videoThumbnail ? { videoThumbnail: payload.videoThumbnail } : {}),
  ...(payload.videoDuration !== undefined
    ? { videoDuration: payload.videoDuration }
    : {}),
});

const buildUpdateData = (
  payload: ReturnType<typeof normalizeContentPayload>
): Record<string, unknown> => ({
  topicId: payload.topicId!,
  title: payload.title!,
  description: payload.description ?? null,
  extractedText: payload.extractedText ?? null,
  type: payload.type!,
  pdfUrl: payload.pdfUrl ?? null,
  markdownBody: payload.markdownBody ?? null,
  externalUrl: payload.externalUrl ?? null,
  externalProvider: payload.externalProvider ?? null,
  playgroundId: payload.playgroundId ?? null,
  videoUrl: payload.videoUrl ?? null,
  videoType: payload.videoType ?? null,
  videoThumbnail: payload.videoThumbnail ?? null,
  videoDuration: payload.videoDuration ?? null,
});

const embeddableFieldChanged = (
  oldContent: {
    videoUrl: string | null;
    pdfUrl: string | null;
    markdownBody: string | null;
    externalUrl: string | null;
  },
  newPayload: ReturnType<typeof normalizeContentPayload>
): boolean =>
  (oldContent.videoUrl ?? null) !== (newPayload.videoUrl ?? null) ||
  (oldContent.pdfUrl ?? null) !== (newPayload.pdfUrl ?? null) ||
  (oldContent.markdownBody ?? null) !== (newPayload.markdownBody ?? null) ||
  (oldContent.externalUrl ?? null) !== (newPayload.externalUrl ?? null);

const ensureContentReadAccess = async (
  req: AuthRequest,
  res: Response,
  batchId: string
): Promise<boolean> => {
  if (req.user?.role !== 'STUDENT') {
    return true;
  }

  const enrollment = await prisma.batchEnrollment.findUnique({
    where: {
      batchId_userId: {
        batchId,
        userId: req.user.userId,
      },
    },
  });

  if (!enrollment) {
    sendError(res, 'Enroll in this course to access its content', 403);
    return false;
  }

  return true;
};

// ── CRUD helpers shared between admin & student reads ─────

export const createContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = normalizeContentPayload(req.body as Record<string, unknown>);
    const validationError = validateContentPayload(payload);
    if (validationError) { sendError(res, validationError, 400); return; }

    const lastContent = await prisma.content.findFirst({
      where: { topicId: payload.topicId! },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const content = await prisma.content.create({
      data: {
        ...(buildCreateData(payload) as Prisma.ContentUncheckedCreateInput),
        order: (lastContent?.order ?? -1) + 1,
      },
    });

    // Fire-and-forget: extract text and generate embeddings
    const orgId = req.user?.organizationId;
    if (orgId) {
      const topic = await prisma.topic.findUnique({
        where: { id: content.topicId },
        include: { chapter: { include: { subject: { select: { batchId: true } } } } },
      });
      const batchId = topic?.chapter?.subject?.batchId;
      if (batchId) {
        extractAndEmbed(content.id, batchId, orgId).catch((err) =>
          logger.error(`Background embedding failed for content ${content.id}: ${err.message}`)
        );
      }
    }

    sendSuccess(res, content, undefined, 201);
  } catch (e) { next(e); }
};

export const getContentsByTopic = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: req.params.topicId },
      include: { chapter: { include: { subject: { select: { batchId: true } } } } },
    });
    if (!topic) { sendError(res, 'Topic not found', 404); return; }
    if (!(await ensureContentReadAccess(req, res, topic.chapter.subject.batchId))) return;
    const contents = await prisma.content.findMany({ where: { topicId: req.params.topicId }, orderBy: { order: 'asc' } });
    sendSuccess(res, contents);
  } catch (e) { next(e); }
};

export const getContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const content = await prisma.content.findUnique({
      where: { id: req.params.id },
      include: { topic: { include: { chapter: { include: { subject: { select: { batchId: true } } } } } } },
    });
    if (!content) { sendError(res, 'Content not found', 404); return; }
    if (!(await ensureContentReadAccess(req, res, content.topic.chapter.subject.batchId))) return;
    sendSuccess(res, content);
  } catch (e) { next(e); }
};

export const updateContent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentContent = await prisma.content.findUnique({ where: { id: req.params.id } });
    if (!currentContent) { sendError(res, 'Content not found', 404); return; }

    const payload = normalizeContentPayload({
      ...currentContent,
      ...req.body,
      title: req.body.title ?? req.body.name ?? currentContent.title,
      topicId: req.body.topicId ?? currentContent.topicId,
    } as Record<string, unknown>);
    const validationError = validateContentPayload(payload);
    if (validationError) { sendError(res, validationError, 400); return; }

    const content = await prisma.content.update({ where: { id: req.params.id }, data: buildUpdateData(payload) as Prisma.ContentUncheckedUpdateInput });

    // Fire-and-forget: only re-extract/re-embed when embeddable source changes
    const orgId = req.user?.organizationId;
    const shouldReembed = embeddableFieldChanged(currentContent, payload);
    if (orgId && shouldReembed) {
      const topic = await prisma.topic.findUnique({
        where: { id: content.topicId },
        include: { chapter: { include: { subject: { select: { batchId: true } } } } },
      });
      const batchId = topic?.chapter?.subject?.batchId;
      if (batchId) {
        extractAndEmbed(content.id, batchId, orgId).catch((err) =>
          logger.error(`Background re-embedding failed for content ${content.id}: ${err.message}`)
        );
      }
    }

    sendSuccess(res, content);
  } catch (e) { next(e); }
};

export const deleteContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Clean up embeddings before deleting content
    deleteContentEmbeddings(req.params.id).catch((err) =>
      logger.error(`Failed to clean up embeddings for content ${req.params.id}: ${err.message}`)
    );
    await prisma.content.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Content deleted' });
  } catch (e) { next(e); }
};

export const reorderContents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topicId = toOptionalString(req.params.topicId);
    const orderedContentIds = Array.isArray(req.body?.orderedContentIds)
      ? req.body.orderedContentIds.filter((value): value is string => isNonEmptyString(value))
      : [];

    if (!topicId) {
      sendError(res, 'topicId is required', 400);
      return;
    }

    if (orderedContentIds.length === 0) {
      sendError(res, 'orderedContentIds is required', 400);
      return;
    }

    const existingContents = await prisma.content.findMany({
      where: { topicId },
      select: { id: true },
      orderBy: { order: 'asc' },
    });

    if (existingContents.length !== orderedContentIds.length) {
      sendError(res, 'orderedContentIds must include all topic content ids', 400);
      return;
    }

    const existingIds = new Set(existingContents.map((content) => content.id));
    const uniqueOrderedIds = new Set(orderedContentIds);

    if (
      uniqueOrderedIds.size !== orderedContentIds.length ||
      orderedContentIds.some((id) => !existingIds.has(id))
    ) {
      sendError(res, 'orderedContentIds contains invalid content ids', 400);
      return;
    }

    await prisma.$transaction(
      orderedContentIds.map((id, index) =>
        prisma.content.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    const reorderedContents = await prisma.content.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
    });

    sendSuccess(res, reorderedContents);
  } catch (e) { next(e); }
};

// ── Progress tracking ──────────────────────────────────────

export const trackProgress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contentId } = req.params;
    const { watchedSeconds, totalDuration } = req.body;
    const userId = req.user!.userId;
    const pct = totalDuration > 0 ? (watchedSeconds / totalDuration) * 100 : 0;
    const isCompleted = pct >= 90;

    const existing = await prisma.contentProgress.findUnique({ where: { userId_contentId: { userId, contentId } } });
    if (existing) {
      await prisma.contentProgress.update({
        where: { userId_contentId: { userId, contentId } },
        data: {
          watchedSeconds: Math.max(existing.watchedSeconds, watchedSeconds),
          totalDuration,
          watchPercentage: pct,
          isCompleted: existing.isCompleted || isCompleted,
          completedAt: !existing.isCompleted && isCompleted ? new Date() : existing.completedAt,
          watchCount: { increment: 1 },
          lastWatchedAt: new Date(),
        },
      });
    } else {
      await prisma.contentProgress.create({
        data: { userId, contentId, watchedSeconds, totalDuration, watchPercentage: pct, isCompleted, completedAt: isCompleted ? new Date() : null, watchCount: 1, lastWatchedAt: new Date() },
      });
    }
    sendSuccess(res, {});
  } catch (e) { next(e); }
};

export const getContentProgress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contentId } = req.params;
    const userId = req.user!.userId;
    const progress = await prisma.contentProgress.findUnique({ where: { userId_contentId: { userId, contentId } } });
    sendSuccess(res, progress || { watchedSeconds: 0, totalDuration: 0, watchPercentage: 0, isCompleted: false, watchCount: 0, lastWatchedAt: null });
  } catch (e) { next(e); }
};

export const markComplete = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { contentId } = req.params;
    const userId = req.user!.userId;
    await prisma.contentProgress.upsert({
      where: { userId_contentId: { userId, contentId } },
      create: { userId, contentId, watchedSeconds: 0, totalDuration: 0, watchPercentage: 100, isCompleted: true, completedAt: new Date(), watchCount: 1, lastWatchedAt: new Date() },
      update: { isCompleted: true, completedAt: new Date(), watchPercentage: 100 },
    });
    sendSuccess(res, { message: 'Marked as complete' });
  } catch (e) { next(e); }
};

export const getRecentlyWatched = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const batchId = req.query.batchId as string | undefined;
    const completedOnly = req.query.completedOnly === 'true';

    let contentIds: string[] | undefined;
    if (batchId) {
      const topics = await prisma.topic.findMany({ where: { chapter: { subject: { batchId } } }, select: { id: true } });
      const topicIds = topics.map((t) => t.id);
      const contents = await prisma.content.findMany({ where: { topicId: { in: topicIds } }, select: { id: true } });
      contentIds = contents.map((c) => c.id);
    }

    const where = { userId, ...(contentIds ? { contentId: { in: contentIds } } : {}), ...(completedOnly ? { isCompleted: true } : {}) };
    const [progresses, total] = await Promise.all([
      prisma.contentProgress.findMany({ where, include: { content: true }, orderBy: { lastWatchedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.contentProgress.count({ where }),
    ]);

    const stats = await prisma.contentProgress.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { watchedSeconds: true },
    });
    const completed = await prisma.contentProgress.count({ where: { userId, isCompleted: true } });
    const total2 = stats._count.id;
    const totalSecs = stats._sum.watchedSeconds || 0;
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    sendSuccess(res, {
      videos: progresses.map((p) => ({ content: p.content, progress: p })),
      stats: { totalVideosWatched: total2, completedVideosCount: completed, totalWatchTimeSeconds: totalSecs, totalWatchTimeFormatted: `${hrs}h ${mins}m`, averageCompletionRate: total2 > 0 ? (completed / total2) * 100 : 0 },
    });
  } catch (e) { next(e); }
};

export const getWatchStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const agg = await prisma.contentProgress.aggregate({ where: { userId }, _count: { id: true }, _sum: { watchedSeconds: true } });
    const completed = await prisma.contentProgress.count({ where: { userId, isCompleted: true } });
    const total = agg._count.id;
    const totalSecs = agg._sum.watchedSeconds || 0;
    const hrs = Math.floor(totalSecs / 3600); const mins = Math.floor((totalSecs % 3600) / 60);
    sendSuccess(res, { totalVideosWatched: total, completedVideosCount: completed, totalWatchTimeSeconds: totalSecs, totalWatchTimeFormatted: `${hrs}h ${mins}m`, averageCompletionRate: total > 0 ? (completed / total) * 100 : 0 });
  } catch (e) { next(e); }
};

export const getBatchProgress = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const batchId = req.query.batchId as string;
    if (!batchId) { sendError(res, 'batchId required', 400); return; }
    const topics = await prisma.topic.findMany({ where: { chapter: { subject: { batchId } } }, select: { id: true } });
    const topicIds = topics.map((t) => t.id);
    const contents = await prisma.content.findMany({ where: { topicId: { in: topicIds }, type: 'Lecture' }, select: { id: true } });
    const contentIds = contents.map((c) => c.id);
    const completed = await prisma.contentProgress.count({ where: { userId, contentId: { in: contentIds }, isCompleted: true } });
    const agg = await prisma.contentProgress.aggregate({ where: { userId, contentId: { in: contentIds } }, _sum: { watchedSeconds: true } });
    sendSuccess(res, { totalVideos: contentIds.length, completedVideos: completed, progressPercentage: contentIds.length > 0 ? (completed / contentIds.length) * 100 : 0, totalWatchTimeSeconds: agg._sum.watchedSeconds || 0 });
  } catch (e) { next(e); }
};
