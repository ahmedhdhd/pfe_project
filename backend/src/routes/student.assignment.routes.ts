import { Router } from 'express';
import { authenticate, requireStudent } from '../middleware/auth';
import * as c from '../controllers/assignment.controller';

const r = Router();

r.use(authenticate);
r.use(requireStudent);

r.get('/:id', c.getStudentAssignment);
r.post('/:id/save', c.saveAssignmentDraft);
r.post('/:id/submit', c.submitAssignment);

export default r;
