import { Router } from 'express';
import * as c from '../controllers/chapter.controller';
import { getCourseOutlineByBatch, listChaptersByBatch } from '../controllers/subject.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.post('/', requireTeacher, c.createChapter);
r.get('/batch/:batchId/hierarchy', getCourseOutlineByBatch);
r.get('/batch/:batchId', listChaptersByBatch);
r.get('/subject/:subjectId', c.listChaptersBySubject);
r.get('/:id', c.getChapter);
r.put('/:id', requireTeacher, c.updateChapter);
r.delete('/:id', requireTeacher, c.deleteChapter);
export default r;
