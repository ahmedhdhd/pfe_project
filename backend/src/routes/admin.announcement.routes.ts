import { Router } from 'express';
import { authenticate, requireTeacher } from '../middleware/auth';
import { requireOrgFeature } from '../middleware/orgFeatures';
import {
  createAnnouncement,
  listAnnouncements,
} from '../controllers/announcement.controller';

const router = Router();

router.use(authenticate);
router.use(requireTeacher);
router.use(requireOrgFeature('announcements'));

router.get('/', listAnnouncements);
router.post('/', createAnnouncement);

export default router;
