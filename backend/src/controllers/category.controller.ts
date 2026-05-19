import { NextFunction, Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendError, sendSuccess } from '../utils/response';

const normalizeName = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const listCategories = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { organizationId: req.user!.organizationId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            parentId: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            icon: true,
            parentId: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            batches: true,
            testSeries: true,
            children: true,
          },
        },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });

    sendSuccess(res, categories);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const name = normalizeName(req.body?.name);
    const icon = normalizeOptionalString(req.body?.icon);
    const parentId = normalizeOptionalString(req.body?.parentId);

    if (!name) {
      sendError(res, 'Category name is required', 400);
      return;
    }

    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: {
          id: parentId,
          organizationId: req.user!.organizationId,
        },
      });

      if (!parent) {
        sendError(res, 'Parent category not found', 404);
        return;
      }
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        organizationId: req.user!.organizationId,
        parentId: parentId || null,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      sendError(res, 'Category already exists', 409);
      return;
    }

    const category = await prisma.category.create({
      data: {
        name,
        icon,
        parentId,
        organizationId: req.user!.organizationId,
      },
    });

    sendSuccess(res, category, undefined, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
    });

    if (!category) {
      sendError(res, 'Category not found', 404);
      return;
    }

    const name = normalizeName(req.body?.name);
    const icon = normalizeOptionalString(req.body?.icon) || null;
    const requestedParentId = normalizeOptionalString(req.body?.parentId);
    const parentId =
      req.body && Object.prototype.hasOwnProperty.call(req.body, 'parentId')
        ? requestedParentId || null
        : category.parentId;

    if (!name) {
      sendError(res, 'Category name is required', 400);
      return;
    }

    if (parentId === category.id) {
      sendError(res, 'A category cannot be its own parent', 400);
      return;
    }

    if (parentId) {
      const parent = await prisma.category.findFirst({
        where: {
          id: parentId,
          organizationId: req.user!.organizationId,
        },
      });

      if (!parent) {
        sendError(res, 'Parent category not found', 404);
        return;
      }

      if (parent.parentId === category.id) {
        sendError(res, 'Nested category loops are not allowed', 400);
        return;
      }
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        id: { not: category.id },
        organizationId: req.user!.organizationId,
        parentId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      sendError(res, 'Category already exists', 409);
      return;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: category.id },
      data: {
        name,
        icon,
        parentId,
      },
    });

    sendSuccess(res, updatedCategory);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
      include: {
        _count: {
          select: {
            batches: true,
            testSeries: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      sendError(res, 'Category not found', 404);
      return;
    }

    if (category._count.children > 0) {
      sendError(
        res,
        'Delete or reassign the subcategories before removing this category.',
        400
      );
      return;
    }

    if (category._count.batches > 0 || category._count.testSeries > 0) {
      sendError(
        res,
        'This category is assigned to one or more courses or exams. Reassign them before deleting it.',
        400
      );
      return;
    }

    await prisma.category.delete({
      where: { id: category.id },
    });

    sendSuccess(res, { message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};
