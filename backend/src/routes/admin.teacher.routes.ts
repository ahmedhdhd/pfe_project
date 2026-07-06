import { Router } from 'express';
import * as c from '../controllers/teacher.controller';
import { authenticate, requireAdmin, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
// Reads are open to teachers (course detail Teachers tab); management stays admin-only
r.get('/', requireTeacher, c.listTeachers);
r.get('/batch/:batchId', requireTeacher, c.getTeachersByBatch);
r.post('/', requireAdmin, c.createTeacher);
r.put('/:id', requireAdmin, c.updateTeacher);
r.delete('/:id', requireAdmin, c.deleteTeacher);
r.post('/:teacherId/batches/:batchId', requireAdmin, c.assignTeacherToBatch);
r.delete('/:teacherId/batches/:batchId', requireAdmin, c.removeTeacherFromBatch);
export default r;
