import { Router } from 'express';
import { authenticate, requireTeacher } from '../middleware/auth';
import { requireOrgFeature } from '../middleware/orgFeatures';
import * as c from '../controllers/assignment.controller';

const r = Router();

r.use(authenticate);
r.use(requireTeacher);
r.use(requireOrgFeature('assignments'));

r.get('/', c.listAssignments);
r.post('/', c.createAssignment);
r.get('/:id', c.getAssignment);
r.put('/:id', c.updateAssignment);
r.delete('/:id', c.deleteAssignment);
r.post('/:id/generate', c.generateAssignmentWithAi);

r.post('/:assignmentId/questions', c.createQuestion);
r.put('/questions/:questionId', c.updateQuestion);
r.delete('/questions/:questionId', c.deleteQuestion);

r.get('/:assignmentId/submissions', c.listSubmissions);
r.get('/:assignmentId/analytics', c.getAssignmentAnalytics);
r.put('/submissions/:submissionId/grade', c.gradeSubmission);
r.post('/submissions/:submissionId/publish', c.publishSubmission);

export default r;
