import { Router } from 'express';
import { authenticate, requireStudent } from '../middleware/auth';
import { requireOrgFeature } from '../middleware/orgFeatures';
import * as c from '../controllers/assignment.controller';

const r = Router();

r.use(authenticate);
r.use(requireStudent);
r.use(requireOrgFeature('assignments'));

r.get('/:id', c.getStudentAssignment);
r.post('/:id/submit', c.submitAssignment);

export default r;
