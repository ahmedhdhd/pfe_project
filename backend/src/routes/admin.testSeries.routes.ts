import { Router } from 'express';
import * as c from '../controllers/testSeries.controller';
import { authenticate, requireAdmin, requireTeacher } from '../middleware/auth';

const r = Router();
r.use(authenticate);

// Test Series
r.post('/test-series', requireAdmin, c.createTestSeries);
r.get('/test-series', requireTeacher, c.listTestSeries);
r.get('/test-series/:id', requireTeacher, c.getTestSeries);
r.put('/test-series/:id', requireAdmin, c.updateTestSeries);
r.delete('/test-series/:id', requireAdmin, c.deleteTestSeries);
r.get('/test-series/:id/stats', requireTeacher, c.getTestSeriesStats);

// Tests
r.post('/tests', requireTeacher, c.createTest);
r.get('/tests/:id', requireTeacher, c.getTest);
r.get('/tests/:id/details', requireTeacher, c.getTestDetails);
r.get('/tests/test-series/:testSeriesId', requireTeacher, c.getTestsBySeriesId);
r.put('/tests/:id', requireTeacher, c.updateTest);
r.delete('/tests/:id', requireAdmin, c.deleteTest);

// Sections
r.post('/tests/:testId/sections', requireTeacher, c.createSection);
r.get('/tests/:testId/sections', requireTeacher, c.getSectionsByTest);
r.get('/sections/test/:testId', requireTeacher, c.getSectionsByTest);
r.post('/sections', requireTeacher, c.createSection);
r.put('/tests/sections/:id', requireTeacher, c.updateSection);
r.delete('/tests/sections/:id', requireTeacher, c.deleteSection);

// Questions
r.post('/tests/sections/:sectionId/questions', requireTeacher, c.createQuestion);
r.post('/tests/sections/:sectionId/questions/bulk', requireTeacher, c.bulkCreateQuestions);
r.get('/tests/sections/:sectionId/questions', requireTeacher, c.getQuestionsBySection);
r.get('/questions/section/:sectionId', requireTeacher, c.getQuestionsBySection);
r.get('/questions/:id', requireTeacher, c.getQuestion);
r.put('/questions/:id', requireTeacher, c.updateQuestion);
r.delete('/questions/:id', requireTeacher, c.deleteQuestion);

export default r;
