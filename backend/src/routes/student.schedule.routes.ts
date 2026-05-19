import { Router } from 'express';
import * as c from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.get('/', c.listSchedules);
r.get('/batch/:batchId', c.getSchedulesByBatch);
r.get('/topic/:topicId', c.getSchedulesByTopic);
r.get('/:id/join-token', c.getScheduleJoinToken);
r.get('/:id/whiteboard', c.getScheduleWhiteboard);
r.patch('/:id/whiteboard', c.updateScheduleWhiteboard);
r.put('/:id/whiteboard', c.updateScheduleWhiteboard);
r.get('/:id', c.getSchedule);
export default r;
