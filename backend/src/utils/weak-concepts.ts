import prisma from './prisma';
import { logger } from './logger';

const MAX_FLAGS_PER_EVENT = 5;

/**
 * Record weak concepts for teacher dashboards (deduped per student/batch/concept).
 */
export async function recordWeakConceptFlags(params: {
  studentId: string;
  batchId: string;
  concepts: unknown[];
  suggestedReviewTopic: string;
}): Promise<void> {
  const concepts = params.concepts
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return String(record.concept || record.title || record.reason || '').trim();
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, MAX_FLAGS_PER_EVENT);

  if (concepts.length === 0) return;

  const suggestedReviewTopic = params.suggestedReviewTopic.trim() || 'Course material';

  await Promise.all(
    concepts.map(async (concept) => {
      try {
        const existing = await prisma.weakConceptFlag.findFirst({
          where: {
            studentId: params.studentId,
            batchId: params.batchId,
            concept,
          },
        });
        if (existing) return;

        await prisma.weakConceptFlag.create({
          data: {
            studentId: params.studentId,
            batchId: params.batchId,
            concept: concept.slice(0, 200),
            suggestedReviewTopic: suggestedReviewTopic.slice(0, 200),
          },
        });
      } catch (error: any) {
        logger.warn(
          `Failed to record weak concept "${concept}" for student ${params.studentId}: ${error?.message || String(error)}`
        );
      }
    })
  );
}
