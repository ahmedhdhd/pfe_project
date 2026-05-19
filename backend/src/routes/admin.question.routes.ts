import { Router } from 'express';
import { getBatchQuestions, createQuestionResponse } from '../controllers/question.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const router = Router();

// These routes will be mounted at /admin/questions
// requireTeacher allows both ADMIN and TEACHER roles usually, based on role middleware.
router.get('/batch/:batchId', authenticate, requireTeacher, getBatchQuestions);
router.post('/:questionId/responses', authenticate, requireTeacher, createQuestionResponse);

export default router;
