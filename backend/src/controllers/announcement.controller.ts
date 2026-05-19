import { NextFunction, Response } from 'express';
import { AnnouncementAudienceType, Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendError, sendSuccess } from '../utils/response';
import { sendAnnouncementEmail } from '../utils/email';

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeAudienceType = (value: unknown): AnnouncementAudienceType =>
  value === 'COURSE'
    ? AnnouncementAudienceType.COURSE
    : AnnouncementAudienceType.ORGANIZATION;

const resolveBrandColor = (
  value: unknown,
  fallback: string
): string => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#([0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
};

const parseThemeColors = (
  value: unknown
): { primaryColor: string; secondaryColor: string } => {
  if (!value || typeof value !== 'object') {
    return {
      primaryColor: '#4f46e5',
      secondaryColor: '#0ea5e9',
    };
  }

  const theme = value as { primaryColor?: unknown; secondaryColor?: unknown };
  return {
    primaryColor: resolveBrandColor(theme.primaryColor, '#4f46e5'),
    secondaryColor: resolveBrandColor(theme.secondaryColor, '#0ea5e9'),
  };
};

const serializeAnnouncement = <
  T extends {
    id: string;
    audienceType: AnnouncementAudienceType;
    subject: string;
    contentHtml: string;
    recipientCount: number;
    createdAt: Date | string;
    createdBy?: {
      id: string;
      username?: string | null;
      email?: string | null;
      role?: string | null;
    } | null;
    batch?: {
      id: string;
      name: string;
    } | null;
  },
>(
  announcement: T
) => ({
  id: announcement.id,
  audienceType: announcement.audienceType,
  subject: announcement.subject,
  contentHtml: announcement.contentHtml,
  recipientCount: announcement.recipientCount,
  createdAt: announcement.createdAt,
  createdBy: announcement.createdBy
    ? {
        id: announcement.createdBy.id,
        username: announcement.createdBy.username || announcement.createdBy.email || 'User',
        role: announcement.createdBy.role || undefined,
      }
    : null,
  batch: announcement.batch || null,
});

export const listAnnouncements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        organizationId: req.user!.organizationId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    sendSuccess(res, announcements.map(serializeAnnouncement));
  } catch (error) {
    next(error);
  }
};

export const listStudentAnnouncements = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;
    const batchId = normalizeOptionalString(req.query?.batchId);

    if (batchId && req.user?.role === 'STUDENT') {
      const enrollment = await prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: {
            batchId,
            userId: req.user.userId,
          },
        },
        select: { id: true },
      });

      if (!enrollment) {
        sendError(res, 'You must be enrolled in this course to view announcements', 403);
        return;
      }
    }

    const where: Prisma.AnnouncementWhereInput = {
      organizationId,
      OR: [
        { audienceType: AnnouncementAudienceType.ORGANIZATION },
        ...(batchId
          ? [{ audienceType: AnnouncementAudienceType.COURSE, batchId }]
          : []),
      ],
    };

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    sendSuccess(res, announcements.map(serializeAnnouncement));
  } catch (error) {
    next(error);
  }
};

export const createAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user!.organizationId;
    const subject = normalizeOptionalString(req.body?.subject);
    const contentHtml = normalizeOptionalString(req.body?.contentHtml);
    const audienceType = normalizeAudienceType(req.body?.audienceType);
    const batchId = normalizeOptionalString(req.body?.batchId);

    if (!subject) {
      sendError(res, 'Announcement subject is required', 400);
      return;
    }

    if (!contentHtml) {
      sendError(res, 'Announcement content is required', 400);
      return;
    }

    if (audienceType === AnnouncementAudienceType.COURSE && !batchId) {
      sendError(res, 'Select a course to announce to enrolled students', 400);
      return;
    }

    let batch:
      | {
          id: string;
          name: string;
        }
      | null = null;

    if (batchId) {
      batch = await prisma.batch.findFirst({
        where: {
          id: batchId,
          organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!batch) {
        sendError(res, 'Course not found', 404);
        return;
      }
    }

    const recipients =
      audienceType === AnnouncementAudienceType.COURSE && batchId
        ? await prisma.batchEnrollment.findMany({
            where: { batchId },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                },
              },
            },
          })
        : await prisma.user.findMany({
            where: {
              organizationId,
              role: 'STUDENT',
            },
            select: {
              id: true,
              email: true,
              username: true,
            },
          });

    const normalizedRecipients = Array.from(
      new Map(
        recipients
          .map((item) => ('user' in item ? item.user : item))
          .filter(
            (user): user is { id: string; email: string; username: string } =>
              Boolean(user?.email)
          )
          .map((user) => [
            user.email.toLowerCase(),
            {
              email: user.email,
              username: user.username,
            },
          ])
      ).values()
    );

    if (normalizedRecipients.length === 0) {
      sendError(
        res,
        audienceType === AnnouncementAudienceType.COURSE
          ? 'No enrolled students with email addresses were found for this course'
          : 'No students with email addresses were found in this organization',
        400
      );
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        config: {
          select: {
            logoUrl: true,
            supportEmail: true,
            themeJson: true,
          },
        },
      },
    });

    const { primaryColor, secondaryColor } = parseThemeColors(
      organization?.config?.themeJson
    );
    const organizationName = organization?.name || 'TeslaAcademy';
    const logoUrl = organization?.config?.logoUrl || '';
    const supportEmail = organization?.config?.supportEmail || '';
    const audienceLabel =
      audienceType === AnnouncementAudienceType.COURSE
        ? batch?.name || 'Selected course'
        : 'All students in the organization';

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${subject}</title>
        </head>
        <body style="margin:0; padding:0; background:#f5f7fa; color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fa; margin:0; padding:24px 0;">
            <tr>
              <td align="center" style="padding:0 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px; background:#ffffff; border:1px solid #e5e7eb; border-radius:20px; overflow:hidden;">
                  <tr>
                    <td style="padding:24px 28px 18px; border-top:4px solid ${primaryColor};">
                      ${
                        logoUrl
                          ? `<img src="${logoUrl}" alt="${organizationName} logo" style="display:block; height:40px; max-width:160px; object-fit:contain;" />`
                          : `<div style="font-size:20px; font-weight:700; color:${primaryColor};">${organizationName}</div>`
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 28px;">
                      <div style="font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:${secondaryColor}; margin-bottom:14px;">
                        Announcement
                      </div>
                      <div style="display:inline-block; margin-bottom:18px; padding:8px 12px; border-radius:999px; background:#f8fafc; border:1px solid #e2e8f0; font-size:12px; font-weight:600; color:#475569;">
                        ${audienceLabel}
                      </div>
                      <h1 style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:30px; line-height:1.2; font-weight:700; color:#0f172a;">
                        ${subject}
                      </h1>
                      <p style="margin:16px 0 0; font-size:15px; line-height:1.75; color:#475569;">
                        You are receiving this update from ${organizationName}.
                      </p>
                      <div style="margin-top:24px; padding:22px 24px; border-radius:16px; background:#ffffff; border:1px solid #e5e7eb; font-size:15px; line-height:1.8; color:#334155;">
                        ${contentHtml}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px 24px; border-top:1px solid #e5e7eb; background:#fcfcfd; font-size:13px; line-height:1.7; color:#64748b;">
                      <div style="font-weight:600; color:#0f172a;">${organizationName}</div>
                      ${
                        supportEmail
                          ? `<div style="margin-top:6px;">Need help? Contact <a href="mailto:${supportEmail}" style="color:${primaryColor}; text-decoration:none;">${supportEmail}</a></div>`
                          : ''
                      }
                      <div style="margin-top:8px;">This message was sent as an official student announcement.</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await sendAnnouncementEmail({
      organizationId,
      recipients: normalizedRecipients.map((recipient) => recipient.email),
      subject,
      html: emailHtml,
    });

    const announcement = await prisma.announcement.create({
      data: {
        organizationId,
        createdByUserId: req.user!.userId,
        audienceType,
        batchId: batch?.id || null,
        subject,
        contentHtml,
        recipientCount: normalizedRecipients.length,
        recipientsJson: normalizedRecipients.map((recipient) => ({
          email: recipient.email,
          username: recipient.username,
        })) as Prisma.InputJsonValue,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    sendSuccess(
      res,
      serializeAnnouncement(announcement),
      'Announcement sent successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};
