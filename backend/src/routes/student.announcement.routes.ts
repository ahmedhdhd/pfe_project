import { Router } from 'express';
import { authenticate, requireStudent } from '../middleware/auth';
import { listStudentAnnouncements } from '../controllers/announcement.controller';

const router = Router();

// Mounted at /api/announcements
router.get('/', authenticate, requireStudent, listStudentAnnouncements);

export default router;

