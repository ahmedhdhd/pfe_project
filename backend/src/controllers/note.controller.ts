import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

export const getBatchNotes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const notes = await prisma.batchNote.findMany({
      where: {
        batchId,
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    sendSuccess(res, notes);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!content) {
      sendError(res, 'Note content is required', 400);
      return;
    }

    // Verify enrollment
    const enrollment = await prisma.batchEnrollment.findUnique({
      where: {
        batchId_userId: {
          batchId,
          userId,
        },
      },
    });

    if (!enrollment) {
      sendError(res, 'You must be enrolled in this course to take notes', 403);
      return;
    }

    const note = await prisma.batchNote.create({
      data: {
        batchId,
        userId,
        content,
      },
    });

    sendSuccess(res, note, 'Note created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const note = await prisma.batchNote.findUnique({
      where: { id },
    });

    if (!note) {
      sendError(res, 'Note not found', 404);
      return;
    }

    if (note.userId !== userId) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    const updatedNote = await prisma.batchNote.update({
      where: { id },
      data: { content },
    });

    sendSuccess(res, updatedNote);
  } catch (error) {
    next(error);
  }
};

export const deleteNote = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const note = await prisma.batchNote.findUnique({
      where: { id },
    });

    if (!note) {
      sendError(res, 'Note not found', 404);
      return;
    }

    if (note.userId !== userId) {
      sendError(res, 'Forbidden', 403);
      return;
    }

    await prisma.batchNote.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Note deleted successfully');
  } catch (error) {
    next(error);
  }
};
