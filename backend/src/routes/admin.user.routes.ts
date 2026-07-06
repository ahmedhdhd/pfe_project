import { Router } from 'express';
import * as c from '../controllers/user.controller';
import { authenticate, requireAdmin, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
// Teachers get read-only access for the student directory; management stays admin-only
r.get('/', requireTeacher, c.listUsers);
r.delete('/:userId', requireAdmin, c.deleteUser);
export default r;
