import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as c from '../controllers/subscription.controller';

const r = Router();

r.get('/status', authenticate, c.getSubscriptionStatus);
r.post('/checkout', authenticate, c.subscriptionCheckout);
r.post('/verify', authenticate, c.subscriptionVerify);

export default r;
