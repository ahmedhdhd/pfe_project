import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';

// ---- STUDENT METHODS ----

export const getBatchQuestions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    
    // Both enrolled students and admins/teachers can view questions
    const questions = await prisma.batchQuestion.findMany({
      where: {
        batchId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImg: true,
          }
        },
        responses: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                profileImg: true,
                role: true,
              }
            }
          },
          orderBy: {
            createdAt: 'asc',
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    sendSuccess(res, questions);
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { title, content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!content) {
      sendError(res, 'Question content is required', 400);
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

    if (!enrollment && req.user?.role === 'STUDENT') {
      sendError(res, 'You must be enrolled in this course to ask a question', 403);
      return;
    }

    const question = await prisma.batchQuestion.create({
      data: {
        batchId,
        userId,
        title,
        content,
        status: 'OPEN',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImg: true,
          }
        },
        responses: true,
      }
    });

    sendSuccess(res, question, 'Question created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const createQuestionResponse = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { questionId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    if (!content) {
      sendError(res, 'Response content is required', 400);
      return;
    }

    const question = await prisma.batchQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      sendError(res, 'Question not found', 404);
      return;
    }

    // Verify access
    if (req.user?.role === 'STUDENT') {
      const enrollment = await prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: {
            batchId: question.batchId,
            userId,
          },
        },
      });

      if (!enrollment) {
        sendError(res, 'You must be enrolled in this course to respond', 403);
        return;
      }
    }

    const response = await prisma.batchQuestionResponse.create({
      data: {
        questionId,
        userId,
        content,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profileImg: true,
            role: true,
          }
        }
      }
    });

    // Update question status if it's a teacher/admin responding
    if (req.user?.role !== 'STUDENT') {
      await prisma.batchQuestion.update({
        where: { id: questionId },
        data: { status: 'ANSWERED' },
      });
    }

    sendSuccess(res, response, 'Response created successfully', 201);
  } catch (error) {
    next(error);
  }
};
