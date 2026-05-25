import { Router } from 'express';
import multer from 'multer';
import * as c from '../controllers/schedule.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const r = Router();
const transcriptChunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});
r.use(authenticate, requireTeacher);
r.post('/', c.createSchedule);
r.get('/', c.listSchedules);
r.get('/batch/:batchId', c.getSchedulesByBatch);
r.get('/topic/:topicId', c.getSchedulesByTopic);
r.get('/:id/join-token', c.getScheduleJoinToken);
r.post('/:id/transcript-chunk', transcriptChunkUpload.single('file'), c.uploadScheduleTranscriptChunk);
r.get('/:id/summary', c.getScheduleSummary);
r.post('/:id/summary/finalize', c.finalizeScheduleSummary);
r.get('/:id/attendance', c.listScheduleAttendance);
r.get('/:id/whiteboard', c.getScheduleWhiteboard);
r.patch('/:id/whiteboard', c.updateScheduleWhiteboard);
r.put('/:id/whiteboard', c.updateScheduleWhiteboard);
r.get('/:id', c.getSchedule);
r.put('/:id', c.updateSchedule);
r.patch('/:id', c.updateSchedule);
r.put('/:id/status', c.updateScheduleStatus);
r.patch('/:id/status', c.updateScheduleStatus);
r.delete('/:id', c.deleteSchedule);
export default r;
