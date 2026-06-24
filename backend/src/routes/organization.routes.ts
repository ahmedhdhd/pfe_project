import { Router } from 'express';
import * as c from '../controllers/organization.controller';
import * as sc from '../controllers/stripeConnect.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const r = Router();
// POST /admin/organizations - Public for initial setup, authenticated otherwise
r.post('/', c.createOrganization);
// GET/POST/PUT /admin/organization-config
r.get('/config', authenticate, requireAdmin, c.getAdminConfig);
r.post('/config', authenticate, requireAdmin, c.createOrUpdateConfig);
r.put('/config', authenticate, requireAdmin, c.createOrUpdateConfig);
r.post('/config/theme/generate', authenticate, requireAdmin, c.generateThemeWithAi);
r.post('/config/stripe/connect', authenticate, requireAdmin, sc.startStripeConnect);
r.post('/config/stripe/disconnect', authenticate, requireAdmin, sc.disconnectStripeConnect);
r.get('/config/stripe/callback', sc.handleStripeConnectCallback);
// GET /api/organization-config/:slug  (public)
r.get('/:slug', c.getPublicConfig);
export default r;
