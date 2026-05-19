import { Router } from 'express';
import * as c from '../controllers/batch.controller';
import { authenticate, requireStudent } from '../middleware/auth';

const r = Router();
r.get('/', c.listPublicBatches);
r.get('/certificates/:credentialId', c.getPublicCertificateIssue);
r.get('/my-batches', authenticate, c.getMyBatches);
r.get('/:batchId/certificate', authenticate, requireStudent, c.getBatchCertificateStatus);
r.post('/:batchId/certificate', authenticate, requireStudent, c.claimBatchCertificate);
r.post('/:batchId/reviews', authenticate, requireStudent, c.createOrUpdateBatchReview);
r.get('/:id', c.getPublicBatch);
r.post('/:batchId/checkout', authenticate, c.checkoutBatch);
r.post('/verify-payment', authenticate, c.verifyBatchPayment);

// Konnect
r.post('/:batchId/konnect-checkout', authenticate, c.konnectCheckoutBatch);
r.post('/konnect-verify', authenticate, c.konnectVerifyBatchPayment);
r.post('/:batchId/enroll-free', authenticate, c.enrollFree);
export default r;
