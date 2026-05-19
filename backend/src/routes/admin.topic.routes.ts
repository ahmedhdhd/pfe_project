import { Router } from 'express';
import * as c from '../controllers/misc.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.post('/', requireTeacher, c.createTopic);
r.get('/chapter/:chapterId', c.listTopicsByChapter);
r.put('/:id/quiz', requireTeacher, c.updateTopicQuiz);
r.delete('/:id/quiz', requireTeacher, c.deleteTopicQuiz);
r.post('/:id/quiz-attempts', c.submitTopicQuizAttempt);
r.get('/:id', c.getTopic);
r.put('/:id', requireTeacher, c.updateTopic);
r.delete('/:id', requireTeacher, c.deleteTopic);
export default r;
