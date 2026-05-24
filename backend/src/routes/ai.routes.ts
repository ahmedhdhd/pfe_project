import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireTeacher } from '../middleware/auth';
import {
  aiChat,
  teacherGeneratePlayground,
  listBatchPlaygrounds,
  getPlaygroundById,
  getWeakConcepts,
  testOpenRouterApiKey,
  getEmbeddingHealth,
} from '../controllers/ai.controller';

const router = Router();

// AI chat rate limiter: 10 requests per user per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.user?.userId || req.ip,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => !req.user,
});

// Playground generation is slower — separate, higher limit for teachers/admins
const playgroundLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req: any) => req.user?.userId || req.ip,
  message: { success: false, message: 'Too many playground requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => !req.user,
});

// Student — chat with AI tutor
router.post('/chat', authenticate, aiLimiter, aiChat);

// Teacher/Admin — generate or refine a playground widget
router.post('/playground/generate', authenticate, requireTeacher, playgroundLimiter, teacherGeneratePlayground);

// Teacher/Admin — list all playgrounds for a batch
router.get('/playgrounds/:batchId', authenticate, requireTeacher, listBatchPlaygrounds);

// Teacher/Admin — fetch one playground (includes HTML for editor preview)
router.get('/playground/:id', authenticate, requireTeacher, getPlaygroundById);

// Teacher/Admin — get weak concept flags for a batch
router.get('/weak-concepts/:batchId', authenticate, getWeakConcepts);

// Admin — test OpenRouter (chat; optional embeddings for RAG)
router.post('/test-openrouter-key', authenticate, testOpenRouterApiKey);

// Admin — RAG embedding health diagnostics
router.get('/embedding-health', authenticate, getEmbeddingHealth);

export default router;

