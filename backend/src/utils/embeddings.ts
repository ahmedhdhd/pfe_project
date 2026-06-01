import { logger } from './logger';
import { aiService } from './ai-service-client';

/**
 * Trigger async content indexing in the AI service (extract text + embeddings).
 */
export async function extractAndEmbed(
  contentId: string,
  batchId: string,
  orgId: string
): Promise<void> {
  try {
    await aiService.indexContent({ contentId, batchId, organizationId: orgId });
  } catch (error: any) {
    logger.error(
      `Failed to enqueue content indexing for ${contentId}: ${error?.message || String(error)}`
    );
  }
}

/**
 * Delete all embeddings for a content record via the AI service.
 */
export async function deleteContentEmbeddings(contentId: string): Promise<void> {
  try {
    await aiService.deleteEmbeddings(contentId);
  } catch (error: any) {
    logger.error(
      `Failed to delete embeddings for content ${contentId}: ${error?.message || String(error)}`
    );
  }
}
