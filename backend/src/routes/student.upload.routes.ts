import { Router } from 'express';
import * as c from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const r = Router();
r.use(authenticate);
r.post('/signed-url', c.getSignedUrl);
r.post('/', c.uploadMiddleware, c.directUpload);
export default r;
