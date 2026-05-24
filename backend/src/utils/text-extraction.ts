import { randomUUID } from 'crypto';
import { createWriteStream, promises as fsPromises } from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import ffmpeg from 'fluent-ffmpeg';

import { logger } from './logger';

const GROQ_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

async function unlinkQuiet(filePath: string): Promise<void> {
  try {
    await fsPromises.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }
}

async function downloadVideoToFile(videoUrl: string, destPath: string): Promise<void> {
  const response = await fetch(videoUrl, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download video (${response.status})`);
  }
  if (!response.body) {
    throw new Error('Video response has no body');
  }

  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(destPath));
}

function extractAudioToMp3(videoPath: string, audioPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioChannels(1)
      .audioBitrate('64k')
      .format('mp3')
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .save(audioPath);
  });
}

async function transcribeWithGroq(audioPath: string, apiKey: string): Promise<string> {
  const audioBuffer = await fsPromises.readFile(audioPath);
  const form = new FormData();
  form.append('model', GROQ_WHISPER_MODEL);
  form.append('file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'audio.mp3');

  const response = await fetch(GROQ_TRANSCRIPTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Groq API error ${response.status}: ${raw.slice(0, 400)}`);
  }

  let payload: { text?: string };
  try {
    payload = JSON.parse(raw) as { text?: string };
  } catch {
    throw new Error(`Invalid Groq transcription response: ${raw.slice(0, 200)}`);
  }

  return typeof payload.text === 'string' ? payload.text.trim() : '';
}

export async function transcribeLocalMediaFileWithGroq(mediaPath: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is not set; cannot transcribe session recording');
  }

  const tempId = randomUUID();
  const audioPath = path.join(os.tmpdir(), `queztlearn-local-audio-${tempId}.mp3`);

  try {
    await extractAudioToMp3(mediaPath, audioPath);
    const transcript = await transcribeWithGroq(audioPath, groqApiKey);
    logger.info(`Extracted ${transcript.length} chars from local media file: ${mediaPath}`);
    return transcript;
  } catch (error: any) {
    logger.error(`Local media transcription failed for ${mediaPath}: ${error.message}`);
    throw error;
  } finally {
    await unlinkQuiet(audioPath);
  }
}

/**
 * Extract transcript from non-YouTube videos (e.g. Supabase-hosted MP4):
 * 1) download video to temp file
 * 2) extract/compress mono MP3 at 64 kbps with ffmpeg
 * 3) call Groq Whisper transcription API
 * 4) cleanup temp files
 */
export async function extractSupabaseVideoTranscript(videoUrl: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  if (!groqApiKey) {
    logger.warn('GROQ_API_KEY is not set; skipping non-YouTube transcription');
    return '';
  }

  const tempId = randomUUID();
  const videoPath = path.join(os.tmpdir(), `queztlearn-video-${tempId}.tmp`);
  const audioPath = path.join(os.tmpdir(), `queztlearn-audio-${tempId}.mp3`);

  try {
    await downloadVideoToFile(videoUrl, videoPath);
    await extractAudioToMp3(videoPath, audioPath);
    const transcript = await transcribeWithGroq(audioPath, groqApiKey);
    logger.info(`Extracted ${transcript.length} chars from non-YouTube video: ${videoUrl}`);
    return transcript;
  } catch (error: any) {
    logger.error(`Non-YouTube transcription failed for ${videoUrl}: ${error.message}`);
    return '';
  } finally {
    await Promise.all([unlinkQuiet(videoPath), unlinkQuiet(audioPath)]);
  }
}

/**
 * Extract a YouTube video ID from various URL formats.
 */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isYouTubeVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

/**
 * Fetch YouTube transcript/captions using the innertube API.
 * Falls back to video metadata (title + description) if captions are unavailable.
 */
export async function extractYouTubeTranscript(videoUrl: string): Promise<string> {
  try {
    const videoId = extractYouTubeId(videoUrl);
    if (!videoId) {
      logger.warn(`Could not extract YouTube ID from URL: ${videoUrl}`);
      return '';
    }

    // Dynamic import to avoid issues if not installed
    const { Innertube } = await import('youtubei.js');
    const yt = await Innertube.create();

    const info = await yt.getInfo(videoId);
    const transcriptData = await info.getTranscript();

    if (
      transcriptData?.transcript?.content?.body?.initial_segments &&
      transcriptData.transcript.content.body.initial_segments.length > 0
    ) {
      const segments = transcriptData.transcript.content.body.initial_segments;
      const text = segments
        .map((seg: any) => {
          const snippet = seg?.snippet?.text || seg?.snippet?.runs?.map((r: any) => r.text).join('') || '';
          return snippet.trim();
        })
        .filter(Boolean)
        .join(' ');

      if (text.length > 0) {
        logger.info(`Extracted ${text.length} chars of transcript for YouTube video ${videoId}`);
        return text;
      }
    }

    // Fallback: use video title + description as content
    const title = info.basic_info?.title || '';
    const description = info.basic_info?.short_description || '';
    const fallback = `${title}\n\n${description}`.trim();
    logger.info(`No transcript available for ${videoId}, using metadata (${fallback.length} chars)`);
    return fallback;
  } catch (error: any) {
    logger.error(`YouTube transcript extraction failed: ${error.message}`);
    return '';
  }
}

/**
 * Download a PDF from a URL and extract its text content.
 */
export async function extractPdfText(pdfUrl: string): Promise<string> {
  try {
    // Dynamic import
    const pdfParse = (await import('pdf-parse')).default;

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      logger.warn(`Failed to fetch PDF from ${pdfUrl}: ${response.status}`);
      return '';
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdfParse(buffer);

    logger.info(`Extracted ${data.text.length} chars from PDF: ${pdfUrl}`);
    return data.text.trim();
  } catch (error: any) {
    logger.error(`PDF text extraction failed for ${pdfUrl}: ${error.message}`);
    return '';
  }
}

/**
 * Router function: extract text from content based on its type.
 */
export async function extractContentText(content: {
  type: string;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  markdownBody?: string | null;
  externalUrl?: string | null;
  title?: string | null;
  description?: string | null;
}): Promise<string> {
  const parts: string[] = [];

  // Always include title + description as metadata
  if (content.title) parts.push(content.title);
  if (content.description) parts.push(content.description);

  switch (content.type) {
    case 'Lecture': {
      if (content.videoUrl) {
        if (isYouTubeVideoUrl(content.videoUrl)) {
          const transcript = await extractYouTubeTranscript(content.videoUrl);
          if (transcript) parts.push(transcript);
        } else {
          const transcript = await extractSupabaseVideoTranscript(content.videoUrl);
          if (transcript) parts.push(transcript);
          parts.push(
            [
              'VIDEO LESSON (hosted video).',
              `Video URL: ${content.videoUrl}`,
              transcript
                ? 'Transcript was auto-generated from hosted video audio.'
                : 'Transcript could not be generated from hosted video audio. Use title/description as fallback or add Markdown/PDF notes.',
            ].join('\n')
          );
        }
      }
      break;
    }
    case 'PDF': {
      if (content.pdfUrl) {
        const pdfText = await extractPdfText(content.pdfUrl);
        if (pdfText) parts.push(pdfText);
      }
      break;
    }
    case 'MARKDOWN': {
      if (content.markdownBody) parts.push(content.markdownBody);
      break;
    }
    case 'URL': {
      // For external URLs we only store metadata (title + description)
      if (content.externalUrl) parts.push(`External resource: ${content.externalUrl}`);
      break;
    }
    default:
      break;
  }

  return parts.join('\n\n').trim();
}
