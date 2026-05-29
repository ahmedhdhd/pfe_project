import { Router } from 'express';
import * as c from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireOrgFeature } from '../middleware/orgFeatures';

const r = Router();
r.use(authenticate, requireAdmin);
r.use(requireOrgFeature('users'));
r.get('/', c.listUsers);
r.delete('/:userId', c.deleteUser);
export default r;
