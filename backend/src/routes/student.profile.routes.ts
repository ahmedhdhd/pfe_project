import { Router } from 'express';
import * as c from '../controllers/misc.controller';
import { authenticate } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.get('/', c.getProfile);
r.put('/', c.updateProfile);
export default r;
