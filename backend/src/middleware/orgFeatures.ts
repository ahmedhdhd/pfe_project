import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { sendError } from '../utils/response';
import { AuthRequest } from './auth';
import type { PlatformFeatureKey } from '../utils/platform-customization';

/** Missing or empty featuresEnabled → feature is enabled (backward compatible). */
export async function isOrgFeatureEnabled(
  organizationId: string,
  feature: PlatformFeatureKey
): Promise<boolean> {
  const config = await prisma.organizationConfig.findUnique({
    where: { organizationId },
    select: { featuresEnabled: true },
  });
  const flags = config?.featuresEnabled as Record<string, boolean> | null;
  if (!flags || typeof flags !== 'object') return true;
  if (!(feature in flags)) return true;
  return Boolean(flags[feature]);
}

export function requireOrgFeature(feature: PlatformFeatureKey) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = req.user?.organizationId;
      if (!orgId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }
      const enabled = await isOrgFeatureEnabled(orgId, feature);
      if (!enabled) {
        sendError(res, `Feature "${feature}" is disabled for this organization`, 403);
        return;
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}
