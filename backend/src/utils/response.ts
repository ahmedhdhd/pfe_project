import { Response } from 'express';

export const sendSuccess = (res: Response, data: unknown, message?: string, status = 200) => {
  return res.status(status).json({ success: true, data, message });
};

export const sendError = (res: Response, message: string, status = 400, error?: string) => {
  return res.status(status).json({ success: false, message, error });
};

export const sendPaginated = (
  res: Response,
  data: unknown[],
  pagination: { page: number; limit: number; total: number },
  status = 200
) => {
  return res.status(status).json({
    success: true,
    data,
    pagination: {
      currentPage: pagination.page,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      totalCount: pagination.total,
      limit: pagination.limit,
      hasNextPage: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPreviousPage: pagination.page > 1,
    },
  });
};
