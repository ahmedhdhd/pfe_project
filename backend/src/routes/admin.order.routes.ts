import { Router } from 'express';
import * as c from '../controllers/order.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const r = Router();

// Orders (payments) are admin-only
r.use(authenticate, requireAdmin);
r.get('/', c.listAdminOrders);
r.get('/:id', c.getAdminOrderById);
r.post('/:id/approve', c.approveAdminOrder);
r.post('/:id/reject', c.rejectAdminOrder);

export default r;
