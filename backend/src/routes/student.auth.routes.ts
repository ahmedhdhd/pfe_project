import { Router } from 'express';
import * as c from '../controllers/studentAuth.controller';

const r = Router();
r.post('/register', c.register);
r.post('/verify-email', c.verifyEmail);
r.post('/set-password', c.setPassword);
r.post('/login', c.login);
r.post('/resend-verification', c.resendVerification);
r.post('/get-otp', c.getOtp);
r.post('/verify-otp', c.verifyOtp);
r.post('/refresh-token', c.refreshToken);
r.post('/forgot-password', c.forgotPassword);
r.post('/reset-password', c.resetPassword);
export default r;
