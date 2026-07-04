import { Router } from 'express';
import * as bc from '../controllers/batch.controller';
import * as cert from '../controllers/batchCertificate.controller';
import * as review from '../controllers/batchReview.controller';
import * as oc from '../controllers/organization.controller';
import { authenticate, requireAdmin, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.get('/', requireTeacher, bc.listBatches);
r.post('/', requireAdmin, bc.createBatch);
r.get('/:id/reviews', requireTeacher, review.listBatchReviews);
r.get('/:id', requireTeacher, bc.getBatch);
r.put('/:id/certificate', requireTeacher, cert.updateBatchCertificateConfig);
r.put('/:id', requireAdmin, bc.updateBatch);
r.delete('/:id', requireAdmin, bc.deleteBatch);
// cache clear lives here for simplicity
r.post('/cache/clear', requireAdmin, oc.clearCache);
export default r;
