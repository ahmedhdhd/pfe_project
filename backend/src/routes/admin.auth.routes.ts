import { Router } from 'express';
import * as c from '../controllers/adminAuth.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const r = Router();
r.post('/register', c.register);
r.post('/verify-email', c.verifyEmail);
r.post('/set-password', c.setPassword);
r.post('/login', c.login);
r.post('/resend-verification', c.resendVerification);
r.post('/refresh', c.refreshAdminToken);
r.post('/invite-user', authenticate, requireAdmin, c.inviteUser);
export default r;
