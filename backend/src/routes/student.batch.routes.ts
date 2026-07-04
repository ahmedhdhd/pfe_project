import { Router } from 'express';
import * as c from '../controllers/batch.controller';
import * as cert from '../controllers/batchCertificate.controller';
import * as review from '../controllers/batchReview.controller';
import * as payment from '../controllers/batchPayment.controller';
import { authenticate, requireStudent } from '../middleware/auth';

const r = Router();
r.get('/', c.listPublicBatches);
r.get('/certificates/:credentialId', cert.getPublicCertificateIssue);
r.get('/my-batches', authenticate, c.getMyBatches);
r.get('/:batchId/certificate', authenticate, requireStudent, cert.getBatchCertificateStatus);
r.post('/:batchId/certificate', authenticate, requireStudent, cert.claimBatchCertificate);
r.post('/:batchId/reviews', authenticate, requireStudent, review.createOrUpdateBatchReview);
r.get('/:id', c.getPublicBatch);
r.post('/:batchId/checkout', authenticate, payment.checkoutBatch);
r.post('/verify-payment', authenticate, payment.verifyBatchPayment);

// Konnect
r.post('/:batchId/konnect-checkout', authenticate, payment.konnectCheckoutBatch);
r.post('/konnect-verify', authenticate, payment.konnectVerifyBatchPayment);
r.post('/:batchId/enroll-free', authenticate, payment.enrollFree);
export default r;
