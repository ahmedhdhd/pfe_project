import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { updateCurrentUser } from '../controllers/user.controller';

const r = Router();

r.use(authenticate);
r.patch('/me', updateCurrentUser);

export default r;
