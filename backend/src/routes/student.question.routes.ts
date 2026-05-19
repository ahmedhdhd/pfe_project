import { Router } from 'express';
import { getBatchQuestions, createQuestion, createQuestionResponse } from '../controllers/question.controller';
import { authenticate, requireStudent } from '../middleware/auth';

const router = Router();

// These routes will be mounted at /api/questions
router.get('/batch/:batchId', authenticate, getBatchQuestions); // Students can see questions if authenticated
router.post('/batch/:batchId', authenticate, requireStudent, createQuestion);
router.post('/:questionId/responses', authenticate, createQuestionResponse); // Students can reply

export default router;
