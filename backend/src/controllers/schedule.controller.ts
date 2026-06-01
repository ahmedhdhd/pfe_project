import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';
import { sendLiveSessionCreatedEmail } from '../utils/email';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { normalizeOptionalString, ensureBatchReadAccess } from './misc.helpers';
import { aiService, AiServiceError } from '../utils/ai-service-client';

const normalizeScheduleTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '');
};

const sanitizeRoomName = (value: string): string => {
  const sanitized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 80);
  return sanitized || `schedule-${randomUUID().slice(0, 8)}`;
};

const generateScheduleRoomName = (scheduleId?: string): string => {
  const suffix = scheduleId || randomUUID().slice(0, 10);
  return sanitizeRoomName(`schedule-${suffix}`);
};

const buildTenantFrontendUrl = (frontendUrl: string, subdomain: string | null | undefined, path: string) => {
  try {
    const url = new URL(frontendUrl);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (subdomain) {
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        url.hostname = `${subdomain}.${url.hostname}`;
      } else if (!url.hostname.startsWith(`${subdomain}.`)) {
        url.hostname = `${subdomain}.${url.hostname}`;
      }
    }
    url.pathname = normalizedPath;
    url.search = '';
    return url.toString();
  } catch {
    return `${frontendUrl.replace(/\/+$/g, '')}${path.startsWith('/') ? path : `/${path}`}`;
  }
};

const resolveScheduleRoomName = (schedule: { id: string; youtubeLink: string }): string => {
  const rawRoomName = schedule.youtubeLink?.trim();
  if (!rawRoomName || /^https?:\/\//i.test(rawRoomName)) return generateScheduleRoomName(schedule.id);
  return sanitizeRoomName(rawRoomName);
};

const serializeSchedule = <T extends { id: string; youtubeLink: string; tagsJson?: unknown }>(schedule: T) => {
  const { youtubeLink, tagsJson, subjectId: _subjectId, topicId: _topicId, subjectName: _subjectName, ...rest } = schedule as T & { subjectId?: unknown; topicId?: unknown; subjectName?: unknown; };
  const r = rest as Record<string, unknown>;
  return {
    ...rest,
    batchId: 'batchId' in r && r.batchId === null ? undefined : r.batchId,
    teacherId: 'teacherId' in r && r.teacherId === null ? undefined : r.teacherId,
    thumbnailUrl: 'thumbnailUrl' in r && r.thumbnailUrl === null ? undefined : r.thumbnailUrl,
    notifyBeforeMinutes: 'notifyBeforeMinutes' in r && r.notifyBeforeMinutes === null ? undefined : r.notifyBeforeMinutes,
    roomName: resolveScheduleRoomName({ id: schedule.id, youtubeLink }),
    tags: normalizeScheduleTags(tagsJson),
  };
};

const buildStudentScheduleWhere = async (req: AuthRequest, where: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
  const organizationId = req.user?.organizationId;
  if (!organizationId) return null;
  if (req.user?.role !== 'STUDENT') return { ...where, organizationId };
  const enrollments = await prisma.batchEnrollment.findMany({ where: { userId: req.user.userId }, select: { batchId: true } });
  const enrolledBatchIds = enrollments.map((e) => e.batchId);
  if (typeof where.batchId === 'string') {
    if (!enrolledBatchIds.includes(where.batchId)) return null;
    return { organizationId, ...where };
  }
  return {
    organizationId, ...where,
    ...(typeof where.batchId === 'string' ? {} : {
      OR: [{ audienceType: 'ORGANIZATION' }, ...(enrolledBatchIds.length > 0 ? [{ audienceType: 'COURSE', batchId: { in: enrolledBatchIds } }] : [])],
    }),
  };
};

const createLiveKitJoinToken = ({ apiKey, apiSecret, identity, name, roomName, metadata, isHost }: { apiKey: string; apiSecret: string; identity: string; name: string; roomName: string; metadata: string; isHost: boolean; }): string =>
  jwt.sign({ name, metadata, video: { room: roomName, roomJoin: true, roomAdmin: isHost, canPublish: isHost, canPublishData: true, canSubscribe: true, canUpdateOwnMetadata: true } }, apiSecret, { algorithm: 'HS256', issuer: apiKey, subject: identity, expiresIn: '2h' });

const DEFAULT_WHITEBOARD_DATA = { version: 1, strokes: [], notes: [] } as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

const normalizeWhiteboardData = (value: unknown) => {
  if (!isPlainObject(value)) return DEFAULT_WHITEBOARD_DATA;
  return { version: 1, strokes: Array.isArray(value.strokes) ? value.strokes : [], notes: Array.isArray(value.notes) ? value.notes : [] };
};

const ensureScheduleReadAccess = async (req: AuthRequest, res: Response, schedule: { organizationId: string; batchId: string | null; audienceType?: 'ORGANIZATION' | 'COURSE'; }): Promise<boolean> => {
  if (schedule.organizationId !== req.user?.organizationId) { sendError(res, 'Live session not found', 404); return false; }
  if (!schedule.batchId || schedule.audienceType === 'ORGANIZATION') return true;
  return ensureBatchReadAccess(req, res, schedule.batchId);
};

const canEditScheduleWhiteboard = (req: AuthRequest, whiteboard: { isStudentEditingEnabled: boolean } | null) => {
  if (req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER') return true;
  return !!whiteboard?.isStudentEditingEnabled;
};

const computeElapsedMinutes = (from: Date, to: Date): number => {
  const ms = to.getTime() - from.getTime();
  if (ms <= 0) return 0;
  return Math.floor(ms / 60000);
};

const isScheduleTerminated = (schedule: { status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED'; scheduledAt: Date; duration: number; }): boolean => {
  return schedule.status === 'COMPLETED' || schedule.status === 'CANCELLED';
};

const generateAiSummaryFromTranscript = async (
  organizationId: string,
  title: string,
  transcript: string
): Promise<string> => {
  try {
    const result = await aiService.summarizeSchedule({
      organizationId,
      title,
      transcript,
    });
    if (!result.summary?.trim()) {
      throw new Error('AI service returned an empty summary');
    }
    return result.summary.trim();
  } catch (error: any) {
    if (error instanceof AiServiceError) {
      throw new Error(error.message);
    }
    throw error;
  }
};

const generateScheduleSummaryForCompletedSession = async (scheduleId: string): Promise<void> => {
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.status !== 'COMPLETED') return;
  if (schedule.summaryStatus === 'READY' && schedule.aiSummary?.trim()) return;

  await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      summaryStatus: 'PENDING',
      summaryError: null,
    },
  });

  try {
    const transcript = schedule.transcriptDraft?.trim() || '';
    if (!transcript) {
      throw new Error(
        'No transcript draft found. Join and end the live session as host so MediaRecorder transcript chunks can be uploaded before summary generation runs.'
      );
    }
    const aiSummary = await generateAiSummaryFromTranscript(schedule.organizationId, schedule.title, transcript);
    await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        aiSummary,
        summaryGeneratedAt: new Date(),
        summaryStatus: 'READY',
        summaryError: null,
      },
    });
  } catch (error: any) {
    const message = error?.message || String(error);
    logger.error(`Failed to generate AI summary for schedule ${scheduleId}: ${message}`);
    try {
      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          aiSummary: null,
          summaryGeneratedAt: new Date(),
          summaryStatus: 'FAILED',
          summaryError: message.slice(0, 2000),
        },
      });
    } catch (persistErr: any) {
      logger.error(`Failed to persist summary generation error for schedule ${scheduleId}: ${persistErr?.message || String(persistErr)}`);
    }
  }
};

// ── Schedules ─────────────────────────────────────────────

export const createSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tags, roomName, youtubeLink, ...rest } = req.body;
    const audienceType = rest.audienceType === 'ORGANIZATION' ? 'ORGANIZATION' : 'COURSE';
    const organizationId = req.user!.organizationId;
    let batchId: string | undefined;
    let batchName: string | undefined;

    if (audienceType === 'COURSE') {
      if (typeof rest.batchId !== 'string' || rest.batchId.trim() === '') { sendError(res, 'batchId is required for course live sessions', 400); return; }
      batchId = rest.batchId.trim();
      const batch = await prisma.batch.findFirst({ where: { id: batchId, organizationId }, select: { id: true, name: true } });
      if (!batch) { sendError(res, 'Course not found', 404); return; }
      batchName = batch.name;
    }

    const teacherId = normalizeOptionalString(rest.teacherId);
    if (teacherId) {
      const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, organizationId }, select: { id: true } });
      if (!teacher) { sendError(res, 'Selected teacher was not found in this organization', 400); return; }
    }

    const generatedRoomName = sanitizeRoomName(typeof roomName === 'string' && roomName.trim() !== '' ? roomName : `schedule-${randomUUID().slice(0, 10)}`);
    const schedule = await prisma.schedule.create({
      data: { title: rest.title, description: rest.description, scheduledAt: rest.scheduledAt, duration: rest.duration, teacherId, thumbnailUrl: rest.thumbnailUrl, notifyBeforeMinutes: rest.notifyBeforeMinutes, organizationId, audienceType, batchId, tagsJson: normalizeScheduleTags(tags), youtubeLink: typeof youtubeLink === 'string' && youtubeLink.trim() !== '' ? sanitizeRoomName(youtubeLink) : generatedRoomName },
    });

    try {
      const recipients = audienceType === 'COURSE' && batchId
        ? await prisma.batchEnrollment.findMany({ where: { batchId }, include: { user: { select: { email: true } } } })
        : await prisma.user.findMany({ where: { organizationId, role: 'STUDENT' }, select: { email: true } });
      const uniqueRecipients = Array.from(new Set(recipients.map((r) => 'user' in r ? r.user?.email : r.email).filter((email): email is string => typeof email === 'string' && email.trim() !== '').map((email) => email.trim().toLowerCase())));
      if (uniqueRecipients.length > 0) {
        const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { subdomain: true } });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const actionUrl = buildTenantFrontendUrl(frontendUrl, organization?.subdomain, batchId ? `/student/batches/${batchId}/schedule/${schedule.id}` : `/student/live-sessions/${schedule.id}`);
        await sendLiveSessionCreatedEmail({ organizationId, recipients: uniqueRecipients, title: schedule.title, description: normalizeOptionalString(schedule.description), scheduledAt: schedule.scheduledAt, duration: schedule.duration, courseName: batchName, actionUrl });
      }
    } catch (notificationError) {
      logger.warn(`Live session created but email notification failed for session ${schedule.id}: ${notificationError instanceof Error ? notificationError.message : 'unknown error'}`);
    }
    sendSuccess(res, serializeSchedule(schedule), undefined, 201);
  } catch (e) { next(e); }
};

export const listSchedules = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, batchId, teacherId, upcoming } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (teacherId) where.teacherId = teacherId;
    if (upcoming === 'true') where.scheduledAt = { gte: new Date() };
    const scopedWhere = await buildStudentScheduleWhere(req, where);
    if (!scopedWhere) { sendError(res, 'Enroll in this course to access its live sessions', 403); return; }
    const [schedules, total] = await Promise.all([prisma.schedule.findMany({ where: scopedWhere, skip: (Number(page) - 1) * Number(limit), take: Number(limit), orderBy: { scheduledAt: 'asc' } }), prisma.schedule.count({ where: scopedWhere })]);
    sendSuccess(res, { data: schedules.map(serializeSchedule), total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) });
  } catch (e) { next(e); }
};

export const getSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;
    sendSuccess(res, serializeSchedule(schedule));
  } catch (e) { next(e); }
};

export const updateSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.user!.organizationId) { sendError(res, 'Live session not found', 404); return; }
    const { tags, roomName, youtubeLink, ...rest } = req.body;
    const teacherId = normalizeOptionalString(rest.teacherId);
    if (teacherId) {
      const teacher = await prisma.teacher.findFirst({ where: { id: teacherId, organizationId: req.user!.organizationId }, select: { id: true } });
      if (!teacher) { sendError(res, 'Selected teacher was not found in this organization', 400); return; }
    }
    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: {
        ...(typeof rest.title === 'string' ? { title: rest.title } : {}),
        ...(typeof rest.description === 'string' || rest.description === null ? { description: rest.description } : {}),
        ...(rest.scheduledAt ? { scheduledAt: rest.scheduledAt } : {}),
        ...(typeof rest.duration === 'number' ? { duration: rest.duration } : {}),
        ...(typeof rest.teacherId === 'string' ? { teacherId } : rest.teacherId === null ? { teacherId: null } : {}),
        ...(typeof rest.thumbnailUrl === 'string' || rest.thumbnailUrl === null ? { thumbnailUrl: rest.thumbnailUrl } : {}),
        ...(typeof rest.notifyBeforeMinutes === 'number' || rest.notifyBeforeMinutes === null ? { notifyBeforeMinutes: rest.notifyBeforeMinutes } : {}),
        ...(typeof roomName === 'string' && roomName.trim() !== '' ? { youtubeLink: sanitizeRoomName(roomName) } : {}),
        ...(typeof youtubeLink === 'string' && youtubeLink.trim() !== '' ? { youtubeLink: sanitizeRoomName(youtubeLink) } : {}),
        ...(tags ? { tagsJson: normalizeScheduleTags(tags) } : {}),
      },
    });
    sendSuccess(res, serializeSchedule(schedule));
  } catch (e) { next(e); }
};

export const updateScheduleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== authReq.user!.organizationId) { sendError(res, 'Live session not found', 404); return; }
    const nextStatus = req.body.status;
    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: nextStatus === 'LIVE' && existing.status !== 'LIVE'
        ? {
            status: nextStatus,
            transcriptDraft: null,
            aiSummary: null,
            summaryGeneratedAt: null,
            summaryStatus: 'NONE',
            summaryError: null,
          }
        : { status: nextStatus },
    });

    if (nextStatus === 'COMPLETED') {
      void generateScheduleSummaryForCompletedSession(schedule.id);
    }
    sendSuccess(res, serializeSchedule(schedule));
  } catch (e) { next(e); }
};

export const getScheduleSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        organizationId: true,
        audienceType: true,
        batchId: true,
        title: true,
        status: true,
        aiSummary: true,
        summaryGeneratedAt: true,
        summaryStatus: true,
        summaryError: true,
      },
    });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;

    sendSuccess(res, {
      scheduleId: schedule.id,
      title: schedule.title,
      status: schedule.status,
      aiSummary: schedule.aiSummary,
      summaryGeneratedAt: schedule.summaryGeneratedAt,
      summaryStatus: schedule.summaryStatus,
      summaryError: schedule.summaryError,
    });
  } catch (e) { next(e); }
};

export const deleteSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.organizationId !== req.user!.organizationId) { sendError(res, 'Live session not found', 404); return; }
    await prisma.schedule.delete({ where: { id: req.params.id } });
    sendSuccess(res, { message: 'Deleted' });
  } catch (e) { next(e); }
};

export const getSchedulesByBatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!(await ensureBatchReadAccess(req, res, req.params.batchId))) return;
    const schedules = await prisma.schedule.findMany({ where: { organizationId: req.user!.organizationId, batchId: req.params.batchId }, orderBy: { scheduledAt: 'asc' } });
    sendSuccess(res, { data: schedules.map(serializeSchedule) });
  } catch (e) { next(e); }
};

export const getSchedulesByTopic = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const topic = await prisma.topic.findUnique({ where: { id: req.params.topicId }, include: { chapter: { include: { subject: { select: { batchId: true } } } } } });
    if (!topic) { sendError(res, 'Topic not found', 404); return; }
    if (!(await ensureBatchReadAccess(req, res, topic.chapter.subject.batchId))) return;
    const schedules = await prisma.schedule.findMany({ where: { organizationId: req.user!.organizationId, topicId: req.params.topicId }, orderBy: { scheduledAt: 'asc' } });
    sendSuccess(res, { data: schedules.map(serializeSchedule) });
  } catch (e) { next(e); }
};

export const getScheduleJoinToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) { sendError(res, 'LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.', 500); return; }
    let schedule = await prisma.schedule.findUnique({ where: { id: req.params.id }, include: { batch: { select: { name: true } }, subject: { select: { name: true } } } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { id: true, username: true, email: true, role: true } });
    if (!user) { sendError(res, 'User not found', 404); return; }
    const isHost = req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER';

    if (isHost) {
      if (schedule.status === 'COMPLETED' || schedule.status === 'CANCELLED') {
        sendError(res, 'This live session is already completed and cannot be started again', 403);
        return;
      }
      if (schedule.status !== 'LIVE') {
        schedule = await prisma.schedule.update({
          where: { id: schedule.id },
          data: {
            status: 'LIVE',
            transcriptDraft: null,
            aiSummary: null,
            summaryGeneratedAt: null,
            summaryStatus: 'NONE',
            summaryError: null,
          },
          include: { batch: { select: { name: true } }, subject: { select: { name: true } } },
        });
      }
    } else if (isScheduleTerminated(schedule)) {
      sendError(res, 'This live session has ended and is no longer accessible', 403);
      return;
    }

    const roomName = resolveScheduleRoomName(schedule);
    const participantName = user.username || user.email || 'Participant';
    const identity = `${isHost ? 'host' : 'student'}-${user.id}`;
    const metadata = JSON.stringify({ scheduleId: schedule.id, batchId: schedule.batchId, batchName: schedule.batch?.name ?? null, role: user.role, userId: user.id });
    const token = createLiveKitJoinToken({ apiKey: livekitApiKey, apiSecret: livekitApiSecret, identity, name: participantName, roomName, metadata, isHost });
    sendSuccess(res, { token, serverUrl: livekitUrl, roomName, identity, participantName, canPublish: isHost, schedule: serializeSchedule(schedule) });
  } catch (e) { next(e); }
};

export const getScheduleWhiteboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id }, include: { whiteboard: true } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;
    const whiteboard = schedule.whiteboard;
    sendSuccess(res, { id: whiteboard?.id, scheduleId: schedule.id, data: normalizeWhiteboardData(whiteboard?.dataJson), isStudentEditingEnabled: whiteboard?.isStudentEditingEnabled ?? false, permissions: { canEdit: canEditScheduleWhiteboard(req, whiteboard ?? null), canManageSettings: req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER' }, updatedAt: whiteboard?.updatedAt ?? null });
  } catch (e) { next(e); }
};

export const updateScheduleWhiteboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id }, include: { whiteboard: true } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;
    const canManageSettings = req.user?.role === 'ADMIN' || req.user?.role === 'TEACHER';
    const canEdit = canEditScheduleWhiteboard(req, schedule.whiteboard ?? null);
    const wantsToChangeBoard = Object.prototype.hasOwnProperty.call(req.body, 'data') || Object.prototype.hasOwnProperty.call(req.body, 'boardData');
    const wantsToChangeStudentEditing = Object.prototype.hasOwnProperty.call(req.body, 'isStudentEditingEnabled');
    if (wantsToChangeBoard && !canEdit) { sendError(res, 'You do not have permission to edit this whiteboard', 403); return; }
    if (wantsToChangeStudentEditing && !canManageSettings) { sendError(res, 'You do not have permission to change whiteboard settings', 403); return; }
    const boardDataSource = Object.prototype.hasOwnProperty.call(req.body, 'data') ? req.body.data : req.body.boardData;
    const updated = await prisma.scheduleWhiteboard.upsert({
      where: { scheduleId: schedule.id },
      create: { scheduleId: schedule.id, organizationId: schedule.organizationId, dataJson: wantsToChangeBoard ? normalizeWhiteboardData(boardDataSource) : DEFAULT_WHITEBOARD_DATA, isStudentEditingEnabled: wantsToChangeStudentEditing && typeof req.body.isStudentEditingEnabled === 'boolean' ? req.body.isStudentEditingEnabled : false },
      update: { ...(wantsToChangeBoard ? { dataJson: normalizeWhiteboardData(boardDataSource) } : {}), ...(wantsToChangeStudentEditing && typeof req.body.isStudentEditingEnabled === 'boolean' ? { isStudentEditingEnabled: req.body.isStudentEditingEnabled } : {}) },
    });
    sendSuccess(res, { id: updated.id, scheduleId: schedule.id, data: normalizeWhiteboardData(updated.dataJson), isStudentEditingEnabled: updated.isStudentEditingEnabled, permissions: { canEdit: canEditScheduleWhiteboard(req, updated), canManageSettings }, updatedAt: updated.updatedAt });
  } catch (e) { next(e); }
};

export const finalizeScheduleSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule || schedule.organizationId !== req.user!.organizationId) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    if (schedule.status !== 'COMPLETED') {
      await prisma.schedule.update({ where: { id: schedule.id }, data: { status: 'COMPLETED' } });
    }

    void generateScheduleSummaryForCompletedSession(schedule.id);
    sendSuccess(res, { message: 'Summary finalization started' });
  } catch (e) { next(e); }
};

export const uploadScheduleTranscriptChunk = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule || schedule.organizationId !== req.user!.organizationId) {
      sendError(res, 'Live session not found', 404);
      return;
    }

    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'TEACHER') {
      sendError(res, 'Only hosts can upload live transcript chunks', 403);
      return;
    }

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file?.buffer?.length) {
      sendError(res, 'No transcript audio chunk was uploaded', 400);
      return;
    }

    let transcriptChunk = '';
    try {
      const result = await aiService.transcribeLocalMedia(
        file.buffer,
        file.originalname || 'chunk.webm'
      );
      transcriptChunk = result.text?.trim() || '';
    } catch (error: any) {
      if (error instanceof AiServiceError) {
        sendError(res, error.message.slice(0, 800), error.statusCode);
        return;
      }
      throw error;
    }

    if (!transcriptChunk) {
      sendSuccess(res, { appended: false, chars: 0 });
      return;
    }

    const updated = await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        transcriptDraft: schedule.transcriptDraft?.trim()
          ? `${schedule.transcriptDraft.trim()}\n\n${transcriptChunk}`
          : transcriptChunk,
      },
      select: { transcriptDraft: true },
    });

    sendSuccess(res, {
      appended: true,
      chars: transcriptChunk.length,
      totalChars: updated.transcriptDraft?.length ?? transcriptChunk.length,
    });
  } catch (e) {
    next(e);
  }
};

export const markScheduleAttendanceJoin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'STUDENT') { sendError(res, 'Only students can mark attendance', 403); return; }
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;

    const now = new Date();
    const attendance = await prisma.scheduleAttendance.upsert({
      where: { scheduleId_userId: { scheduleId: schedule.id, userId: req.user.userId } },
      create: {
        scheduleId: schedule.id,
        userId: req.user.userId,
        joinedAt: now,
        lastJoinedAt: now,
        leftAt: null,
        isPresent: true,
      },
      update: {
        lastJoinedAt: now,
        leftAt: null,
        isPresent: true,
      },
    });

    sendSuccess(res, attendance);
  } catch (e) { next(e); }
};

export const markScheduleAttendanceLeave = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user?.role !== 'STUDENT') { sendError(res, 'Only students can mark attendance', 403); return; }
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;

    const existing = await prisma.scheduleAttendance.findUnique({
      where: { scheduleId_userId: { scheduleId: schedule.id, userId: req.user.userId } },
    });
    if (!existing) { sendError(res, 'Attendance not found. Join the session first.', 400); return; }

    const now = new Date();
    const elapsed = existing.lastJoinedAt ? computeElapsedMinutes(existing.lastJoinedAt, now) : 0;
    const attendance = await prisma.scheduleAttendance.update({
      where: { id: existing.id },
      data: {
        durationMins: existing.durationMins + elapsed,
        leftAt: now,
        lastJoinedAt: null,
        isPresent: false,
      },
    });

    sendSuccess(res, attendance);
  } catch (e) { next(e); }
};

export const listScheduleAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schedule = await prisma.schedule.findUnique({ where: { id: req.params.id } });
    if (!schedule) { sendError(res, 'Live session not found', 404); return; }
    if (!(await ensureScheduleReadAccess(req, res, schedule))) return;
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'TEACHER') { sendError(res, 'You do not have permission to view attendance', 403); return; }

    const attendance = await prisma.scheduleAttendance.findMany({
      where: { scheduleId: schedule.id },
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    const now = new Date();
    const normalizedDurations = attendance.map((row) => {
      const liveExtra = row.lastJoinedAt ? computeElapsedMinutes(row.lastJoinedAt, now) : 0;
      return row.durationMins + liveExtra;
    });
    const totalAttendanceMins = normalizedDurations.reduce((sum, mins) => sum + mins, 0);
    const participants = attendance.length;
    const presentNow = attendance.filter((row) => !!row.lastJoinedAt).length;
    const averageAttendanceMins = participants > 0 ? Math.round(totalAttendanceMins / participants) : 0;
    const streamStartedAt = attendance.length > 0 ? attendance.reduce((min, row) => row.joinedAt < min ? row.joinedAt : min, attendance[0].joinedAt) : null;
    const streamEndedAt = attendance.length > 0
      ? attendance.reduce((max, row) => {
        const candidate = row.lastJoinedAt ?? row.leftAt ?? row.joinedAt;
        return candidate > max ? candidate : max;
      }, attendance[0].leftAt ?? attendance[0].lastJoinedAt ?? attendance[0].joinedAt)
      : null;
    const streamingDurationMins = streamStartedAt && streamEndedAt ? computeElapsedMinutes(streamStartedAt, streamEndedAt) : 0;

    sendSuccess(res, {
      data: attendance,
      summary: {
        participants,
        presentNow,
        totalAttendanceMins,
        averageAttendanceMins,
        streamingDurationMins,
        streamStartedAt,
        streamEndedAt,
      },
    });
  } catch (e) { next(e); }
};
