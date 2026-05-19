import { Router } from 'express';
import * as c from '../controllers/misc.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const r = Router();
r.use(authenticate, requireAdmin);
r.get('/', c.listUsers);
r.delete('/:userId', c.deleteUser);
export default r;
