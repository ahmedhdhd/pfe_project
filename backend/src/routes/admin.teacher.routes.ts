import { Router } from 'express';
import * as c from '../controllers/teacher.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const r = Router();
r.use(authenticate, requireAdmin);
r.post('/', c.createTeacher);
r.get('/', c.listTeachers);
r.get('/batch/:batchId', c.getTeachersByBatch);
r.put('/:id', c.updateTeacher);
r.delete('/:id', c.deleteTeacher);
r.post('/:teacherId/batches/:batchId', c.assignTeacherToBatch);
r.delete('/:teacherId/batches/:batchId', c.removeTeacherFromBatch);
export default r;
