import { Router } from 'express';
import { authenticate, requireTeacher } from '../middleware/auth';
import {
  createAnnouncement,
  listAnnouncements,
} from '../controllers/announcement.controller';

const router = Router();

router.use(authenticate);
router.use(requireTeacher);

router.get('/', listAnnouncements);
router.post('/', createAnnouncement);

export default router;
