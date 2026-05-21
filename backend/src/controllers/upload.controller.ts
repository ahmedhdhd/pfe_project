import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { uploadFile, createSignedUploadUrl, getPublicUrl } from '../utils/s3';

// ── Upload middleware ─────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
export const uploadMiddleware = upload.single('file');

// ── Upload endpoints ──────────────────────────────────────

export const getSignedUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Left for backwards compatibility if still called, but normally not needed
    sendError(res, 'Direct upload is used via Supabase.', 400);
  } catch (e) { next(e); }
};

export const directUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) { sendError(res, 'No file provided', 400); return; }
    const folder = (req.body.folder as string) || 'uploads';
    const result = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, folder);
    sendSuccess(res, { key: result.key, url: result.publicUrl, bucket: 'supabase', originalName: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype });
  } catch (e) { next(e); }
};

export const initiateMultipart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { fileName, folder } = req.body;
    if (!fileName) { sendError(res, 'File name is required', 400); return; }
    const result = await createSignedUploadUrl(fileName, folder || 'uploads');
    sendSuccess(res, { uploadId: result.key, key: result.key, bucket: 'supabase', signedUrl: result.signedUrl });
  } catch (e) { next(e); }
};

export const getMultipartUrls = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.body;
    if (!key) { sendError(res, 'Key is required', 400); return; }
    const publicUrl = getPublicUrl(key);
    sendSuccess(res, { urls: [{ partNumber: 1, uploadUrl: publicUrl }], expiresIn: 3600 });
  } catch (e) { next(e); }
};

export const completeMultipart = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.body;
    if (!key) { sendError(res, 'Key is required', 400); return; }
    const publicUrl = getPublicUrl(key);
    sendSuccess(res, { key, publicUrl, cdnUrl: publicUrl, bucket: 'supabase' });
  } catch (e) { next(e); }
};
