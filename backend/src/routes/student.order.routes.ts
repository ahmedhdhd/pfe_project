import { Router } from 'express';
import * as c from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.get('/history', c.listStudentOrders);
r.get('/:id', c.getStudentOrderById);
r.post('/checkout', c.createCourseOrderCheckout);
r.post('/:id/proof', c.uploadStudentOrderProof);
export default r;
