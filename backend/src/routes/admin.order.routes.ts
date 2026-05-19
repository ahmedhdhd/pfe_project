import { Router } from 'express';
import * as c from '../controllers/order.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const r = Router();

r.use(authenticate, requireTeacher);
r.get('/', c.listAdminOrders);
r.get('/:id', c.getAdminOrderById);
r.post('/:id/approve', c.approveAdminOrder);
r.post('/:id/reject', c.rejectAdminOrder);

export default r;
