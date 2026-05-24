import { randomUUID } from 'crypto';
import { createWriteStream, promises as fsPromises } from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import jwt from 'jsonwebtoken';

import { logger } from './logger';
import { downloadSupabaseFileToPath, parseSupabaseRecordingRef, SUPABASE_RECORDING_PREFIX } from './s3';

type EgressInfo = {
  egress_id?: string;
  status?: string | number;
  file_results?: Array<{ filename?: string }>;
  error?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveLiveKitHttpUrl = (): string | null => {
  const egressUrl = process.env.LIVEKIT_EGRESS_URL?.trim();
  if (egressUrl) return egressUrl.replace(/\/+$/g, '');

  const base = process.env.LIVEKIT_URL?.trim();
  if (!base) return null;
  if (base.startsWith('ws://')) return `http://${base.slice(5).replace(/\/+$/g, '')}`;
  if (base.startsWith('wss://')) return `https://${base.slice(6).replace(/\/+$/g, '')}`;
  return base.replace(/\/+$/g, '');
};

const parseEgressStatus = (status?: string | number): string => {
  if (typeof status === 'number') {
    switch (status) {
      case 0: return 'EGRESS_STARTING';
      case 1: return 'EGRESS_ACTIVE';
      case 2: return 'EGRESS_ENDING';
      case 3: return 'EGRESS_COMPLETE';
      case 4: return 'EGRESS_FAILED';
      case 5: return 'EGRESS_ABORTED';
      default: return `UNKNOWN_${status}`;
    }
  }
  return String(status || '').toUpperCase();
};

const isTerminalStatus = (status?: string | number): boolean => {
  const normalized = parseEgressStatus(status);
  return normalized === 'EGRESS_COMPLETE' || normalized === 'EGRESS_FAILED' || normalized === 'EGRESS_ABORTED';
};

const buildServiceToken = (): string => {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required for egress');
  }
  return jwt.sign(
    {
      video: {
        roomRecord: true,
        roomAdmin: true,
      },
    },
    apiSecret,
    {
      algorithm: 'HS256',
      issuer: apiKey,
      subject: 'schedule-egress-service',
      expiresIn: '1h',
    }
  );
};

async function postTwirp(methodName: string, payload: Record<string, unknown>, token: string): Promise<any> {
  const baseUrl = resolveLiveKitHttpUrl();
  if (!baseUrl) throw new Error('LIVEKIT_EGRESS_URL or LIVEKIT_URL is required');

  const response = await fetch(`${baseUrl}/twirp/livekit.Egress/${methodName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`LiveKit egress ${methodName} failed (${response.status}): ${raw.slice(0, 500)}`);
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON from LiveKit egress ${methodName}: ${raw.slice(0, 300)}`);
  }
}

const getDefaultOutputDir = (): string => {
  const envPath = process.env.LIVEKIT_EGRESS_OUTPUT_DIR?.trim();
  if (envPath) return path.resolve(envPath);
  return path.resolve(process.cwd(), 'storage', 'livekit-egress');
};

type LiveKitS3UploadConfig = {
  access_key: string;
  secret: string;
  bucket: string;
  region: string;
  endpoint?: string;
  force_path_style?: boolean;
};

const deriveSupabaseS3Endpoint = (): string | null => {
  const explicit = process.env.SUPABASE_S3_ENDPOINT?.trim();
  if (explicit) return explicit.replace(/\/+$/g, '');

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (!supabaseUrl) return null;

  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0];
    if (!projectRef) return null;
    return `https://${projectRef}.storage.supabase.co/storage/v1/s3`;
  } catch {
    return null;
  }
};

/** Supabase Storage S3-compatible credentials (for LiveKit egress direct upload). */
export const buildSupabaseS3UploadConfig = (): LiveKitS3UploadConfig | null => {
  const accessKey = process.env.SUPABASE_S3_ACCESS_KEY_ID?.trim();
  const secret = process.env.SUPABASE_S3_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.SUPABASE_BUCKET?.trim();
  const region = process.env.SUPABASE_S3_REGION?.trim();
  const endpoint = deriveSupabaseS3Endpoint();

  if (!accessKey || !secret || !bucket || !region || !endpoint) return null;
  if (/your-|changeme|example/i.test(accessKey) || /your-|changeme|example/i.test(secret)) return null;

  return {
    access_key: accessKey,
    secret,
    bucket,
    region,
    endpoint,
    force_path_style: true,
  };
};

const buildAwsS3UploadConfig = (): LiveKitS3UploadConfig | null => {
  const accessKey = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secret = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.AWS_S3_BUCKET?.trim();
  const region = process.env.AWS_REGION?.trim();
  if (!accessKey || !secret || !bucket || !region) return null;
  if (/your-|changeme|example/i.test(accessKey) || /your-|changeme|example/i.test(secret)) return null;
  return { access_key: accessKey, secret, bucket, region };
};

const buildEgressS3UploadConfig = (): LiveKitS3UploadConfig | null => {
  const preferSupabase = process.env.LIVEKIT_EGRESS_STORAGE !== 'aws';
  if (preferSupabase) {
    const supabase = buildSupabaseS3UploadConfig();
    if (supabase) return supabase;
  }
  return buildAwsS3UploadConfig();
};

export const buildScheduleEgressOutputPath = (scheduleId: string): string =>
  path.join(getDefaultOutputDir(), `${scheduleId}-${Date.now()}.mp4`);

async function downloadMediaToFile(mediaUrl: string, destPath: string): Promise<void> {
  const response = await fetch(mediaUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download recording (${response.status})`);
  }
  if (!response.body) {
    throw new Error('Recording download response has no body');
  }
  await fsPromises.mkdir(path.dirname(destPath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destPath));
}

/** Resolve a LiveKit file result or stored path to a readable local file (downloads HTTP URLs). */
export async function resolveLocalRecordingPath(fileRef: string): Promise<string | null> {
  const trimmed = fileRef.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    const tempPath = path.join(os.tmpdir(), `livekit-recording-${randomUUID()}.mp4`);
    try {
      await downloadMediaToFile(trimmed, tempPath);
      return tempPath;
    } catch (error: any) {
      logger.error(`Failed to download recording from URL: ${error?.message || String(error)}`);
      return null;
    }
  }

  const resolveSupabaseKeyToTemp = async (key: string): Promise<string | null> => {
    const tempPath = path.join(os.tmpdir(), `livekit-recording-${randomUUID()}.mp4`);
    try {
      await downloadSupabaseFileToPath(key, tempPath);
      return tempPath;
    } catch (error: any) {
      logger.error(`Failed to download Supabase recording (${key}): ${error?.message || String(error)}`);
      return null;
    }
  };

  if (trimmed.startsWith(SUPABASE_RECORDING_PREFIX)) {
    const key = parseSupabaseRecordingRef(trimmed);
    if (!key) return null;
    return resolveSupabaseKeyToTemp(key);
  }

  if (trimmed.startsWith('live-sessions/')) {
    return resolveSupabaseKeyToTemp(trimmed);
  }

  if (trimmed.startsWith('s3://')) {
    const cloudfront = process.env.AWS_CLOUDFRONT_URL?.trim();
    const match = trimmed.match(/^s3:\/\/([^/]+)\/(.+)$/);
    if (cloudfront && match) {
      const key = match[2];
      const tempPath = path.join(os.tmpdir(), `livekit-recording-${randomUUID()}.mp4`);
      const url = `${cloudfront.replace(/\/+$/g, '')}/${key}`;
      try {
        await downloadMediaToFile(url, tempPath);
        return tempPath;
      } catch (error: any) {
        logger.error(`Failed to download recording from CDN (${url}): ${error?.message || String(error)}`);
        return null;
      }
    }
    logger.warn(`Cannot resolve ${trimmed} without AWS_CLOUDFRONT_URL or a direct HTTPS URL from egress`);
    return null;
  }

  const outputDir = getDefaultOutputDir();
  const candidates = [
    trimmed,
    path.isAbsolute(trimmed) ? trimmed : path.resolve(trimmed),
    path.resolve(outputDir, trimmed),
    path.resolve(outputDir, path.basename(trimmed)),
  ];

  for (const candidate of [...new Set(candidates)]) {
    try {
      await fsPromises.access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function startRoomAudioEgress(
  roomName: string,
  outputPath: string,
  scheduleId?: string
): Promise<{ egressId: string; recordingPath: string }> {
  const token = buildServiceToken();
  const s3 = buildEgressS3UploadConfig();
  let recordingPath = outputPath;
  let filepath = outputPath;

  if (s3) {
    const scheduleSegment = scheduleId || path.basename(outputPath, path.extname(outputPath));
    filepath = `live-sessions/${scheduleSegment}/${path.basename(outputPath)}`;
    recordingPath = s3.endpoint
      ? `${SUPABASE_RECORDING_PREFIX}${filepath}`
      : `s3://${s3.bucket}/${filepath}`;
    logger.info(
      `Starting LiveKit egress with ${s3.endpoint ? 'Supabase' : 'AWS'} S3 output: ${recordingPath}`
    );
  } else {
    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true });
    logger.info(`Starting LiveKit egress with local output: ${outputPath}`);
  }

  const fileOutput: Record<string, unknown> = { filepath };
  if (s3) {
    fileOutput.s3 = s3;
  }

  const payload = {
    room_name: roomName,
    audio_only: true,
    file_outputs: [fileOutput],
  };
  const started = (await postTwirp('StartRoomCompositeEgress', payload, token)) as EgressInfo;
  if (!started.egress_id) throw new Error('LiveKit egress did not return egress_id');

  return { egressId: started.egress_id, recordingPath };
}

export async function stopEgress(egressId: string): Promise<void> {
  const token = buildServiceToken();
  await postTwirp('StopEgress', { egress_id: egressId }, token);
}

export async function waitForEgressFile(
  egressId: string,
  fallbackPath?: string,
  timeoutMs = Number(process.env.LIVEKIT_EGRESS_MAX_WAIT_MS || 30 * 60 * 1000)
): Promise<string | null> {
  const token = buildServiceToken();
  const startedAt = Date.now();
  let lastInfo: EgressInfo | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    const listed = (await postTwirp('ListEgress', { egress_id: egressId }, token)) as { items?: EgressInfo[] };
    const current = listed.items?.[0];
    if (current) lastInfo = current;

    if (current && isTerminalStatus(current.status)) {
      const normalized = parseEgressStatus(current.status);
      if (normalized !== 'EGRESS_COMPLETE') {
        throw new Error(`Egress ended with status ${normalized}: ${current.error || 'unknown error'}`);
      }
      const fileRef = current.file_results?.[0]?.filename || fallbackPath || null;
      if (!fileRef) return null;
      return resolveLocalRecordingPath(fileRef);
    }

    await sleep(2000);
  }

  logger.warn(`Timed out waiting for egress ${egressId} completion`);
  const fileRef = lastInfo?.file_results?.[0]?.filename || fallbackPath || null;
  if (!fileRef) return null;
  return resolveLocalRecordingPath(fileRef);
}

