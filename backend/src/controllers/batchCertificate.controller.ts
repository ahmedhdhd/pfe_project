import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  CertificateContextBatch,
  buildCertificateIssuePayload,
  certificateConfigIsReady,
  getBatchProgressSummary,
  isCertificateProgressEligible,
  normalizeCertificateTemplateId,
  normalizeHexColor,
  normalizeOptionalString,
  resolveCertificateTitle,
  serializeCertificateConfig,
  serializeCertificateIssue,
} from './batch.helpers';

export const updateBatchCertificateConfig = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const existingBatch = await prisma.batch.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
    });

    if (!existingBatch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    const enabled = Boolean(req.body?.enabled);
    const certificateTemplateId =
      normalizeCertificateTemplateId(req.body?.templateId) || null;
    const certificateTitle = normalizeOptionalString(req.body?.title) ?? null;
    const certificateHeading = normalizeOptionalString(req.body?.heading) ?? null;
    const certificateIssuerName =
      normalizeOptionalString(req.body?.issuerName) ?? null;
    const certificateSignerName =
      normalizeOptionalString(req.body?.signerName) ?? null;
    const certificateSignerTitle =
      normalizeOptionalString(req.body?.signerTitle) ?? null;
    const certificateLinkedInOrgId =
      normalizeOptionalString(req.body?.linkedInOrgId) ?? null;
    const certificatePrimaryColor =
      normalizeHexColor(req.body?.primaryColor) ?? null;
    const certificateSecondaryColor =
      normalizeHexColor(req.body?.secondaryColor) ?? null;

    if (enabled && !certificateTemplateId) {
      sendError(
        res,
        'Please choose one of the available certificate templates before enabling certificates',
        400
      );
      return;
    }

    const [updatedBatch] = await prisma.$queryRaw<CertificateContextBatch[]>(
      Prisma.sql`
        UPDATE "batches"
        SET
          "certificateEnabled" = ${enabled},
          "certificateTemplateId" = ${certificateTemplateId},
          "certificateTitle" = ${certificateTitle},
          "certificateHeading" = ${certificateHeading},
          "certificateIssuerName" = ${certificateIssuerName},
          "certificateSignerName" = ${certificateSignerName},
          "certificateSignerTitle" = ${certificateSignerTitle},
          "certificateLinkedInOrgId" = ${certificateLinkedInOrgId},
          "certificatePrimaryColor" = ${certificatePrimaryColor},
          "certificateSecondaryColor" = ${certificateSecondaryColor}
        WHERE "id" = ${req.params.id}
        RETURNING *
      `
    );

    sendSuccess(
      res,
      { certificate: serializeCertificateConfig(updatedBatch) },
      'Certificate settings updated successfully'
    );
  } catch (e) {
    next(e);
  }
};

export const getBatchCertificateStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const userId = req.user!.userId;

    const [batch, enrollment] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          organization: {
            select: {
              name: true,
              slug: true,
              config: {
                select: {
                  themeJson: true,
                  logoUrl: true,
                },
              },
            },
          },
          createdByUser: {
            select: {
              username: true,
            },
          },
          teachers: {
            include: {
              teacher: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
          certificateIssues: {
            where: { userId },
            take: 1,
            orderBy: { issuedAt: 'desc' },
          },
        },
      }),
      prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: { batchId, userId },
        },
      }),
    ]);

    if (!batch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    if (!enrollment) {
      sendError(res, 'Enroll in this course first to access certificates', 403);
      return;
    }

    const progress = await getBatchProgressSummary(batchId, userId);
    const issue = batch.certificateIssues[0];
    const config = serializeCertificateConfig(batch);
    const configured = certificateConfigIsReady(batch);
    const eligible = configured && isCertificateProgressEligible(progress);

    sendSuccess(res, {
      batchId: batch.id,
      batchName: batch.name,
      certificate: issue
        ? serializeCertificateIssue(buildCertificateIssuePayload(issue, batch))
        : null,
      config,
      configured,
      progress,
      isCompleted: progress.isCompleted,
      eligible,
    });
  } catch (e) {
    next(e);
  }
};

export const claimBatchCertificate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { batchId } = req.params;
    const userId = req.user!.userId;

    const [batch, enrollment, user] = await Promise.all([
      prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          organization: {
            select: {
              name: true,
              slug: true,
              config: {
                select: {
                  themeJson: true,
                  logoUrl: true,
                },
              },
            },
          },
          createdByUser: {
            select: {
              username: true,
            },
          },
          teachers: {
            include: {
              teacher: {
                select: {
                  name: true,
                },
              },
            },
            take: 1,
          },
          certificateIssues: {
            where: { userId },
            take: 1,
            orderBy: { issuedAt: 'desc' },
          },
        },
      }),
      prisma.batchEnrollment.findUnique({
        where: {
          batchId_userId: { batchId, userId },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true },
      }),
    ]);

    if (!batch) {
      sendError(res, 'Batch not found', 404);
      return;
    }

    if (!enrollment) {
      sendError(res, 'Enroll in this course first to claim a certificate', 403);
      return;
    }

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (!certificateConfigIsReady(batch)) {
      sendError(
        res,
        'This course certificate has not been configured yet',
        400
      );
      return;
    }

    const progress = await getBatchProgressSummary(batchId, userId);

    if (!isCertificateProgressEligible(progress)) {
      sendError(
        res,
        `Complete the course before claiming a certificate. Current progress: ${Math.round(progress.progressPercentage)}%`,
        400
      );
      return;
    }

    const existingIssue = batch.certificateIssues[0];

    if (existingIssue) {
      sendSuccess(res, {
        certificate: serializeCertificateIssue(
          buildCertificateIssuePayload(existingIssue, batch)
        ),
        progress,
      });
      return;
    }

    const issue = await prisma.batchCertificateIssue.create({
      data: {
        batchId: batch.id,
        userId,
        recipientNameSnapshot: user.username,
        batchNameSnapshot: batch.name,
        certificateTitleSnapshot: resolveCertificateTitle(
          batch.name,
          batch.certificateTitle
        ),
        templateUrlSnapshot: null,
        issuerNameSnapshot:
          batch.certificateIssuerName?.trim() || batch.organization.name,
        signerNameSnapshot:
          batch.certificateSignerName?.trim() ||
          batch.createdByUser?.username ||
          batch.teachers?.[0]?.teacher?.name ||
          batch.organization.name,
        signerTitleSnapshot: batch.certificateSignerTitle?.trim() || 'Course Creator',
        linkedInOrgIdSnapshot: batch.certificateLinkedInOrgId,
        progressPercentage: progress.progressPercentage,
      },
    });

    sendSuccess(
      res,
      {
        certificate: serializeCertificateIssue(
          buildCertificateIssuePayload(issue, batch)
        ),
        progress,
      },
      'Certificate issued successfully',
      201
    );
  } catch (e) {
    next(e);
  }
};

export const getPublicCertificateIssue = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const issue = await prisma.batchCertificateIssue.findUnique({
      where: { credentialId: req.params.credentialId },
      include: {
        batch: {
          include: {
            organization: {
              select: {
                name: true,
                slug: true,
                config: {
                  select: {
                    themeJson: true,
                    logoUrl: true,
                  },
                },
              },
            },
            createdByUser: {
              select: {
                username: true,
              },
            },
            teachers: {
              include: {
                teacher: {
                  select: {
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!issue) {
      sendError(res, 'Certificate not found', 404);
      return;
    }

    sendSuccess(res, {
      certificate: serializeCertificateIssue(
        buildCertificateIssuePayload(issue, issue.batch)
      ),
      organization: issue.batch.organization,
      batch: {
        id: issue.batch.id,
        name: issue.batch.name,
        imageUrl: issue.batch.imageUrl,
      },
    });
  } catch (e) {
    next(e);
  }
};
