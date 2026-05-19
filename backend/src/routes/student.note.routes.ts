import { Router } from 'express';
import { getBatchNotes, createNote, updateNote, deleteNote } from '../controllers/note.controller';
import { authenticate, requireStudent } from '../middleware/auth';

const router = Router();

// These routes will be mounted at /api/notes
router.get('/batch/:batchId', authenticate, requireStudent, getBatchNotes);
router.post('/batch/:batchId', authenticate, requireStudent, createNote);
router.put('/:id', authenticate, requireStudent, updateNote);
router.delete('/:id', authenticate, requireStudent, deleteNote);

export default router;
