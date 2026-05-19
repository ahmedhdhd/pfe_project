import { Router } from 'express';
import * as c from '../controllers/content.controller';
import { authenticate } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.get('/recently-watched', c.getRecentlyWatched);
r.get('/watch-stats', c.getWatchStats);
r.get('/batch-progress', c.getBatchProgress);
r.post('/:contentId/progress', c.trackProgress);
r.get('/:contentId/progress', c.getContentProgress);
r.post('/:contentId/complete', c.markComplete);
export default r;
