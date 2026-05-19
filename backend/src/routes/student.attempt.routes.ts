import { Router } from 'express';
import * as c from '../controllers/attempt.controller';
import { authenticate } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.post('/start/:testId', c.startAttempt);
r.get('/recent-completed', c.getRecentCompleted);
r.get('/stats', c.getAttemptStats);
r.get('/test/:testId/my-attempts', c.getMyAttemptsByTest);
r.get('/test/:testId/leaderboard', c.getLeaderboard);
r.get('/:attemptId', c.getAttemptDetails);
r.post('/:attemptId/answer', c.saveAnswer);
r.post('/:attemptId/submit', c.submitAttempt);
r.get('/:attemptId/results', c.getAttemptResults);
r.get('/:attemptId/solutions', c.getAttemptSolutions);
export default r;
