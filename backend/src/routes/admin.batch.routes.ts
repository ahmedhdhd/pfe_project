import { Router } from 'express';
import * as bc from '../controllers/batch.controller';
import * as oc from '../controllers/organization.controller';
import { authenticate, requireAdmin, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.get('/', requireTeacher, bc.listBatches);
r.post('/', requireAdmin, bc.createBatch);
r.get('/:id/reviews', requireTeacher, bc.listBatchReviews);
r.get('/:id', requireTeacher, bc.getBatch);
r.put('/:id/certificate', requireTeacher, bc.updateBatchCertificateConfig);
r.put('/:id', requireAdmin, bc.updateBatch);
r.delete('/:id', requireAdmin, bc.deleteBatch);
// cache clear lives here for simplicity
r.post('/cache/clear', requireAdmin, oc.clearCache);
export default r;
