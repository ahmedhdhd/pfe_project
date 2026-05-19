import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import {
  aiChat,
  teacherGeneratePlayground,
  listBatchPlaygrounds,
  getWeakConcepts,
  testOpenRouterApiKey,
  getEmbeddingHealth,
} from '../controllers/ai.controller';

const router = Router();

// AI-specific rate limiter: 10 requests per student per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req: any) => req.user?.userId || req.ip,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: any) => !req.user, // only applies to authenticated requests
});

// Student — chat with AI tutor
router.post('/chat', authenticate, aiLimiter, aiChat);

// Teacher — generate or refine a playground widget
router.post('/playground/generate', authenticate, aiLimiter, teacherGeneratePlayground);

// Teacher/Admin — list all playgrounds for a batch
router.get('/playgrounds/:batchId', authenticate, listBatchPlaygrounds);

// Teacher/Admin — get weak concept flags for a batch
router.get('/weak-concepts/:batchId', authenticate, getWeakConcepts);

// Admin — test OpenRouter (chat; optional embeddings for RAG)
router.post('/test-openrouter-key', authenticate, testOpenRouterApiKey);

// Admin — RAG embedding health diagnostics
router.get('/embedding-health', authenticate, getEmbeddingHealth);

export default router;

