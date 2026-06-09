import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { signAccessToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';

export const platformLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const superAdminPasswordHash = process.env.SUPER_ADMIN_PASSWORD_HASH;

    if (!superAdminEmail || !superAdminPasswordHash) {
      sendError(res, 'Super admin is not configured', 503);
      return;
    }

    if (email !== superAdminEmail) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    const valid = await bcrypt.compare(password, superAdminPasswordHash);
    if (!valid) {
      sendError(res, 'Invalid credentials', 401);
      return;
    }

    const token = signAccessToken({
      userId: 'platform',
      role: 'SUPER_ADMIN',
      organizationId: 'platform',
      email,
    });

    sendSuccess(res, { token });
  } catch (e) {
    next(e);
  }
};

export const getPlatformStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalOrganizations,
      totalUsers,
      totalStudents,
      totalTeachers,
      revenueAgg,
      totalCourses,
      totalEnrollments,
      newOrgsThisMonth,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.teacher.count(),
      prisma.order.aggregate({
        _sum: { amount: true },
        where: { paymentStatus: 'SUCCESS' },
      }),
      prisma.batch.count(),
      prisma.batchEnrollment.count(),
      prisma.organization.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    sendSuccess(res, {
      totalOrganizations,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      totalCourses,
      totalEnrollments,
      newOrgsThisMonth,
    });
  } catch (e) {
    next(e);
  }
};

export const listOrganizations = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        config: true,
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.config?.plan ?? 'free',
      isActive: org.isActive,
      userCount: org._count.users,
      createdAt: org.createdAt,
      maintenanceMode: org.config?.maintenanceMode ?? false,
    }));

    sendSuccess(res, data);
  } catch (e) {
    next(e);
  }
};

export const getOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        config: true,
        _count: { select: { users: true, batches: true } },
      },
    });

    if (!org) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    sendSuccess(res, {
      id: org.id,
      name: org.name,
      slug: org.slug,
      subdomain: org.subdomain,
      domain: org.domain,
      isActive: org.isActive,
      createdAt: org.createdAt,
      userCount: org._count.users,
      batchCount: org._count.batches,
      plan: org.config?.plan ?? 'free',
      subscriptionPrice: org.config?.subscriptionPrice ?? 0,
      subscriptionType: org.config?.subscriptionType ?? 'onetime',
      maintenanceMode: org.config?.maintenanceMode ?? false,
    });
  } catch (e) {
    next(e);
  }
};

export const updateOrganizationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const org = await prisma.organization.update({
      where: { id },
      data: { isActive },
    });

    sendSuccess(res, org);
  } catch (e) {
    next(e);
  }
};

export const updateOrganizationPlan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { plan, subscriptionPrice, subscriptionType } = req.body;

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    const config = await prisma.organizationConfig.update({
      where: { organizationId: id },
      data: { plan, subscriptionPrice, subscriptionType },
    });

    sendSuccess(res, config);
  } catch (e) {
    next(e);
  }
};

export const toggleMaintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { maintenanceMode } = req.body;

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) {
      sendError(res, 'Organization not found', 404);
      return;
    }

    const config = await prisma.organizationConfig.update({
      where: { organizationId: id },
      data: { maintenanceMode },
    });

    sendSuccess(res, config);
  } catch (e) {
    next(e);
  }
};

export const deleteOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.organization.delete({ where: { id } });
    sendSuccess(res, { message: 'Organization deleted' });
  } catch (e) {
    next(e);
  }
};

export const listReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.query;
    const reports = await prisma.report.findMany({
      where: status ? { status: String(status) } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, reports);
  } catch (e) {
    next(e);
  }
};

export const resolveReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await prisma.report.update({
      where: { id },
      data: { status, resolvedAt: new Date() },
    });

    sendSuccess(res, report);
  } catch (e) {
    next(e);
  }
};
