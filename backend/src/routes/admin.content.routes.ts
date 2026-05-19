import { Router } from 'express';
import * as c from '../controllers/content.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.post('/', requireTeacher, c.createContent);
r.get('/topic/:topicId', c.getContentsByTopic);
r.put('/topic/:topicId/reorder', requireTeacher, c.reorderContents);
r.get('/:id', c.getContent);
r.put('/:id', requireTeacher, c.updateContent);
r.delete('/:id', requireTeacher, c.deleteContent);
export default r;
