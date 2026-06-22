/**
 * Storage utility — Supabase
 */

import { promises as fsPromises } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import WebSocket from 'ws';

export const LIVE_SESSION_RECORDINGS_FOLDER = 'live-sessions';
export const SUPABASE_RECORDING_PREFIX = 'supabase:';

// ── Supabase client ───────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side only
  {
    realtime: {
      transport: WebSocket,
    },
  }
);

const BUCKET = process.env.SUPABASE_BUCKET!;

// ── Helpers ──────────────────────────────────────────────────────

const makeKey = (fileName: string, folder: string): string => {
  const ext = fileName.split('.').pop();
  return `${folder}/${uuidv4()}.${ext}`;
};

const getContentType = (ext: string): string => {
  const types: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
};

// ── Signed URLs for uploads ───────────────────────────────────────

export const createSignedUploadUrl = async (
  fileName: string,
  folder: string
): Promise<{ signedUrl: string; key: string; token: string }> => {
  const key = makeKey(fileName, folder);
  const fileExt = fileName.split('.').pop() || '';
  const contentType = getContentType(fileExt);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(key);

  if (error) throw error;

  return {
    signedUrl: data.signedUrl,
    key,
    token: data.token,
  };
};

export const getPublicUrl = (key: string): string => {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
};

// ── Upload (simple) ──────────────────────────────────────────────

export const uploadFile = async (
  file: Buffer,
  fileName: string,
  fileType: string,
  folder: string
): Promise<{ key: string; publicUrl: string }> => {
  const key = makeKey(fileName, folder);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, {
      contentType: fileType,
      upsert: false,
    });

  if (error) throw error;

  return {
    key,
    publicUrl: getPublicUrl(key),
  };
};

// ── Delete ───────────────────────────────────────────────────────

export const deleteFile = async (key: string): Promise<void> => {
  const { error } = await supabase.storage.from(BUCKET).remove([key]);
  if (error) throw error;
};

export const buildLiveSessionRecordingKey = (scheduleId: string): string =>
  `${LIVE_SESSION_RECORDINGS_FOLDER}/${scheduleId}/${Date.now()}.mp4`;

export const parseSupabaseRecordingRef = (recordingPath: string): string | null => {
  const trimmed = recordingPath.trim();
  if (!trimmed.startsWith(SUPABASE_RECORDING_PREFIX)) return null;
  return trimmed.slice(SUPABASE_RECORDING_PREFIX.length);
};

export const uploadBufferToKey = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<{ key: string; publicUrl: string }> => {
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return { key, publicUrl: getPublicUrl(key) };
};

/** Upload a finished LiveKit recording file into Supabase Storage. */
export const uploadLiveSessionRecordingFromPath = async (
  localPath: string,
  scheduleId: string
): Promise<{ key: string; publicUrl: string }> => {
  const buffer = await fsPromises.readFile(localPath);
  const key = buildLiveSessionRecordingKey(scheduleId);
  return uploadBufferToKey(buffer, key, 'audio/mp4');
};

export const isSupabaseStorageConfigured = (): boolean =>
  !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() && process.env.SUPABASE_BUCKET?.trim());

export const downloadSupabaseFileToPath = async (key: string, destPath: string): Promise<void> => {
  const { data, error } = await supabase.storage.from(BUCKET).download(key);
  if (error) throw error;
  if (!data) throw new Error(`Supabase download returned no data for key: ${key}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  await fsPromises.writeFile(destPath, buffer);
};
