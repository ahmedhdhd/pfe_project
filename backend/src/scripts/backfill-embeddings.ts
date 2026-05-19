import { PrismaClient } from '@prisma/client';
import { extractAndEmbed } from '../utils/embeddings';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function backfillEmbeddings() {
  logger.info('Starting pgvector RAG backfill process...');

  try {
    const contents = await prisma.content.findMany({
      include: {
        topic: {
          include: {
            chapter: {
              include: {
                subject: {
                  select: { batchId: true },
                },
              },
            },
          },
        },
      },
    });

    logger.info(`Found ${contents.length} total content items to process.`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const content of contents) {
      try {
        const batchId = content.topic?.chapter?.subject?.batchId;

        if (!batchId) {
          logger.warn(`Content ${content.id} has no valid batch hierarchy. Skipping.`);
          skipped++;
          continue;
        }

        // We need the orgId from the batch to get the right API key
        const batch = await prisma.batch.findUnique({
          where: { id: batchId },
          select: { organizationId: true },
        });

        if (!batch?.organizationId) {
          logger.warn(`Batch ${batchId} has no organization. Skipping content ${content.id}.`);
          skipped++;
          continue;
        }

        logger.info(`Processing content ${content.id} (${content.title})...`);

        await extractAndEmbed(content.id, batchId, batch.organizationId);
        processed++;

        // Sleep to avoid rate limits (2 seconds between items)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        logger.error(`Failed to process content ${content.id}: ${error.message}`);
        errors++;
      }
    }

    logger.info('===================================');
    logger.info('Backfill Complete!');
    logger.info(`Processed successfully: ${processed}`);
    logger.info(`Skipped: ${skipped}`);
    logger.info(`Errors: ${errors}`);
    logger.info('===================================');
  } catch (error: any) {
    logger.error(`Fatal error during backfill: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillEmbeddings();
