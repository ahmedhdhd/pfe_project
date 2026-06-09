import { Router } from 'express';
import * as c from '../controllers/platform.controller';
import { authenticatePlatform, requireSuperAdmin } from '../middleware/superAdmin';

const r = Router();

r.post('/auth/login', c.platformLogin);

r.use(authenticatePlatform);
r.get('/stats', requireSuperAdmin, c.getPlatformStats);
r.get('/organizations', requireSuperAdmin, c.listOrganizations);
r.get('/organizations/:id', requireSuperAdmin, c.getOrganization);
r.patch('/organizations/:id/status', requireSuperAdmin, c.updateOrganizationStatus);
r.patch('/organizations/:id/plan', requireSuperAdmin, c.updateOrganizationPlan);
r.patch('/organizations/:id/maintenance', requireSuperAdmin, c.toggleMaintenanceMode);
r.delete('/organizations/:id', requireSuperAdmin, c.deleteOrganization);
r.get('/reports', requireSuperAdmin, c.listReports);
r.patch('/reports/:id/resolve', requireSuperAdmin, c.resolveReport);

export default r;
