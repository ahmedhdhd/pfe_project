import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as c from '../controllers/organization.controller';

const r = Router();

r.put('/:organizationId/config', authenticate, requireAdmin, c.updateOrganizationConfigById);

export default r;
