import { Router } from 'express';
import * as c from '../controllers/testSeries.controller';
import { authenticate } from '../middleware/auth';

const r = Router();

// Test series
r.get('/test-series', c.listPublicTestSeries);
r.get('/test-series/my-test-series', authenticate, c.getMyTestSeries);
r.get('/test-series/:identifier', c.getPublicTestSeries);
r.get('/test-series/:seriesId/tests', c.getPublicTestsBySeriesId);
r.post('/test-series/:testSeriesId/checkout', authenticate, c.checkoutTestSeries);
r.post('/test-series/:testSeriesId/enroll-free', authenticate, c.enrollFreeTestSeries);
r.post('/test-series/verify-payment', authenticate, c.verifyTestSeriesPayment);

// Konnect
r.post('/test-series/:testSeriesId/konnect-checkout', authenticate, c.konnectCheckoutTestSeries);
r.post('/test-series/konnect-verify', authenticate, c.konnectVerifyTestSeriesPayment);

// Tests
r.get('/tests/:identifier', c.getPublishedTestDetails);
r.get('/tests/:testId/preview', authenticate, c.getTestPreview);

export default r;
