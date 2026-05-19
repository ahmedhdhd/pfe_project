import { Router } from 'express';
import * as c from '../controllers/misc.controller';
import { authenticate, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate, requireTeacher);
r.post('/signed-url', c.getSignedUrl);
r.post('/', c.uploadMiddleware, c.directUpload);
r.post('/multipart/initiate', c.initiateMultipart);
r.post('/multipart/signed-urls', c.getMultipartUrls);
r.post('/multipart/complete', c.completeMultipart);
export default r;
