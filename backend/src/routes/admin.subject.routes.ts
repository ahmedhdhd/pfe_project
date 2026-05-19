import { Router } from 'express';
import * as c from '../controllers/misc.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.post('/', requireTeacher, c.createSubject);
r.get('/batch/:batchId/hierarchy', c.getCourseHierarchyByBatch);
r.get('/batch/:batchId', c.listSubjectsByBatch);
r.get('/:id', c.getSubject);
r.put('/:id', requireTeacher, c.updateSubject);
r.delete('/:id', requireTeacher, c.deleteSubject);
export default r;
