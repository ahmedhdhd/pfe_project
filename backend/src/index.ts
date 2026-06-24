process.on('uncaughtException', (err) => {
  console.error('!!! UNCAUGHT EXCEPTION AT TOP LEVEL !!!', err);
  setTimeout(() => process.exit(1), 300000);
});
process.on('unhandledRejection', (err) => {
  console.error('!!! UNHANDLED REJECTION AT TOP LEVEL !!!', err);
  setTimeout(() => process.exit(1), 300000);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

import adminAuthRoutes from './routes/admin.auth.routes';
import studentAuthRoutes from './routes/student.auth.routes';
import organizationRoutes from './routes/organization.routes';
import adminBatchRoutes from './routes/admin.batch.routes';
import adminCategoryRoutes from './routes/admin.category.routes';
import adminAnnouncementRoutes from './routes/admin.announcement.routes';
import adminAssignmentRoutes from './routes/admin.assignment.routes';
import adminTeacherRoutes from './routes/admin.teacher.routes';
import adminSubjectRoutes from './routes/admin.subject.routes';
import adminChapterRoutes from './routes/admin.chapter.routes';
import adminTopicRoutes from './routes/admin.topic.routes';
import adminContentRoutes from './routes/admin.content.routes';
import adminScheduleRoutes from './routes/admin.schedule.routes';
import adminTestSeriesRoutes from './routes/admin.testSeries.routes';
import adminUserRoutes from './routes/admin.user.routes';
import adminUploadRoutes from './routes/admin.upload.routes';
import adminOrderRoutes from './routes/admin.order.routes';
import studentBatchRoutes from './routes/student.batch.routes';
import studentAssignmentRoutes from './routes/student.assignment.routes';
import studentContentRoutes from './routes/student.content.routes';
import studentTestSeriesRoutes from './routes/student.testSeries.routes';
import studentAttemptRoutes from './routes/student.attempt.routes';
import studentScheduleRoutes from './routes/student.schedule.routes';
import studentProfileRoutes from './routes/student.profile.routes';
import studentOrderRoutes from './routes/student.order.routes';
import studentUploadRoutes from './routes/student.upload.routes';
import subscriptionRoutes from './routes/subscription.routes';
import aiRoutes from './routes/ai.routes';
import studentNoteRoutes from './routes/student.note.routes';
import studentQuestionRoutes from './routes/student.question.routes';
import studentAnnouncementRoutes from './routes/student.announcement.routes';
import adminQuestionRoutes from './routes/admin.question.routes';
import platformRoutes from './routes/platform.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Handle preflight OPTIONS requests immediately
app.options('*', cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: false,
}));

const isProduction = process.env.NODE_ENV === 'production';
const authMax = Number(process.env.AUTH_RATE_LIMIT_MAX ?? (isProduction ? 20 : 1000));
const globalMax = Number(process.env.GLOBAL_RATE_LIMIT_MAX ?? (isProduction ? 300 : 5000));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: globalMax,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: authMax,
  standardHeaders: true,
  legacyHeaders: false,
  // During local dev, failed retries can quickly trigger 429.
  // This keeps production behavior unchanged while making local auth testing smoother.
  skipSuccessfulRequests: !isProduction,
});
app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'TeslaAcademy API running', timestamp: new Date().toISOString() });
});

// ─── Admin routes ────────────────────────────────────────
app.use('/admin/auth',              authLimiter, adminAuthRoutes);
app.use('/admin/organizations',     organizationRoutes);
app.use('/admin/organization-config', organizationRoutes);
app.use('/admin/users',             adminUserRoutes);
app.use('/admin/batches',           adminBatchRoutes);
app.use('/admin/categories',        adminCategoryRoutes);
app.use('/admin/announcements',     adminAnnouncementRoutes);
app.use('/admin/assignments',       adminAssignmentRoutes);
app.use('/admin/teachers',          adminTeacherRoutes);
app.use('/admin/subjects',          adminSubjectRoutes);
app.use('/admin/chapters',          adminChapterRoutes);
app.use('/admin/topics',            adminTopicRoutes);
app.use('/admin/contents',          adminContentRoutes);
app.use('/admin/schedules',         adminScheduleRoutes);
// Test series router handles /test-series, /tests, /sections, /questions internally
app.use('/admin',                   adminTestSeriesRoutes);
app.use('/admin/upload',            adminUploadRoutes);
app.use('/admin/orders',            adminOrderRoutes);
app.use('/admin/cache',             adminBatchRoutes); // clearCache lives on batch router
app.use('/admin/questions',         adminQuestionRoutes);

// ─── Platform (Super Admin) routes ───────────────────────
app.use('/platform',                authLimiter, platformRoutes);

// ─── Student / client routes ─────────────────────────────
app.use('/api/auth',                authLimiter, studentAuthRoutes);
app.use('/api/organization-config', organizationRoutes);
app.use('/api/profile',             studentProfileRoutes);
app.use('/api/batches',             studentBatchRoutes);
app.use('/api/assignments',         studentAssignmentRoutes);
// subjects/chapters/topics share read-only logic with admin routers
app.use('/api/subjects',            adminSubjectRoutes);
app.use('/api/chapters',            adminChapterRoutes);
app.use('/api/topics',              adminTopicRoutes);
app.use('/api/contents',            adminContentRoutes);
app.use('/api/content',             studentContentRoutes);   // progress tracking
app.use('/api',                     studentTestSeriesRoutes); // /test-series, /tests
app.use('/api/attempts',            studentAttemptRoutes);
app.use('/api/schedules',           studentScheduleRoutes);
app.use('/api/orders',              studentOrderRoutes);
app.use('/api/upload',              studentUploadRoutes);
app.use('/api/subscription',        subscriptionRoutes);
app.use('/api/ai',                  aiRoutes);
app.use('/api/notes',               studentNoteRoutes);
app.use('/api/questions',           studentQuestionRoutes);
app.use('/api/announcements',       studentAnnouncementRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    // Attempt to start the server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 TeslaAcademy API running on port ${PORT}`);
      console.log(`🚀 TeslaAcademy API running on port ${PORT}`);
    });

    server.on('error', (error) => {
      logger.error('❌ Server startup error:', error);
      console.error('❌ Server startup error:', error);
    });

  } catch (error) {
    logger.error('❌ Fatal error during startup:', error);
    console.error('❌ Fatal error during startup:', error);
    // Keep process alive for 5 minutes so Azure can capture logs
    setTimeout(() => process.exit(1), 300000); 
  }
}

startServer();

export default app;
