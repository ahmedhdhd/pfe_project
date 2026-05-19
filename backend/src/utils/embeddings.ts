import prisma from './prisma';
import { logger } from './logger';
import { extractContentText } from './text-extraction';
import { buildOpenRouterHeaders } from './openrouter';

// ── Chunking ─────────────────────────────────────────────────────────────────

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP = 100;

/**
 * Split text into overlapping chunks for embedding.
 */
export function chunkText(
  text: string,
  maxChars = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP
): string[] {
  if (!text || text.length <= maxChars) {
    return text ? [text] : [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('. ', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const bestBreak = Math.max(lastPeriod, lastNewline);
      if (bestBreak > start + maxChars * 0.5) {
        end = bestBreak + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks.filter((c) => c.length > 0);
}

// ── Embedding generation (OpenRouter — must match content_embeddings vector dim) ──

/** Default model: 3072 dimensions to match existing pgvector schema. */
const OPENROUTER_EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || 'openai/text-embedding-3-large';
const EXPECTED_EMBEDDING_DIMENSIONS = 3072;

/**
 * Get OpenRouter API key for embeddings (same key as chat).
 */
export async function getOrgOpenRouterKey(orgId: string): Promise<string> {
  try {
    const config = await prisma.organizationConfig.findUnique({
      where: { organizationId: orgId },
      select: { openRouterApiKey: true },
    });
    if (config?.openRouterApiKey?.trim()) return config.openRouterApiKey.trim();
  } catch {
    // fall through
  }
  return process.env.OPENROUTER_API_KEY?.trim() || '';
}

/**
 * Generate an embedding vector via OpenRouter (OpenAI-compatible embeddings API).
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const truncated = text.slice(0, 8000);
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: buildOpenRouterHeaders(apiKey),
    body: JSON.stringify({
      model: OPENROUTER_EMBEDDING_MODEL,
      input: truncated,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter embeddings ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ embedding: number[] }>;
  };
  const vector = data?.data?.[0]?.embedding;
  if (!vector?.length) {
    throw new Error('OpenRouter embeddings: empty vector in response');
  }
  if (vector.length !== EXPECTED_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension is ${vector.length} but the database expects ${EXPECTED_EMBEDDING_DIMENSIONS}. ` +
        `Set OPENROUTER_EMBEDDING_MODEL to a model that outputs ${EXPECTED_EMBEDDING_DIMENSIONS} dimensions, or migrate the vector column.`
    );
  }
  return vector;
}

// ── pgvector similarity search ──────────────────────────────────────────────

export interface ChunkResult {
  chunk_text: string;
  source_field: string;
  similarity: number;
  metadata: {
    contentTitle?: string;
    topicName?: string;
    chapterName?: string;
    contentId?: string;
    topicId?: string;
  };
}

/**
 * Search for the most similar chunks to a query embedding within a batch.
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  batchId: string,
  topK = 5
): Promise<ChunkResult[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const results = await prisma.$queryRawUnsafe<
    Array<{
      chunk_text: string;
      source_field: string;
      similarity: number;
      metadata: any;
    }>
  >(
    `SELECT
       chunk_text,
       source_field,
       1 - (embedding <=> $1::vector) AS similarity,
       metadata
     FROM content_embeddings
     WHERE batch_id = $2
       AND 1 - (embedding <=> $1::vector) > 0.52
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    embeddingStr,
    batchId,
    topK
  );

  return results.map((r) => ({
    chunk_text: r.chunk_text,
    source_field: r.source_field,
    similarity: Number(r.similarity),
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata || {},
  }));
}

// ── Upsert embeddings for a content record ──────────────────────────────────

/**
 * Extract text, chunk it, generate embeddings, and store them in pgvector.
 */
export async function upsertContentEmbeddings(
  contentId: string,
  batchId: string,
  orgId: string
): Promise<void> {
  const apiKey = await getOrgOpenRouterKey(orgId);
  if (!apiKey) {
    logger.warn(`No OpenRouter API key configured for org ${orgId}, skipping embeddings`);
    return;
  }

  // Fetch the content with its hierarchy info
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      topic: {
        include: {
          chapter: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!content) {
    logger.warn(`Content ${contentId} not found, skipping embeddings`);
    return;
  }

  const textToEmbed = content.extractedText || '';
  if (!textToEmbed) {
    logger.info(`No extracted text for content ${contentId}, skipping embeddings`);
    return;
  }

  const metadata = JSON.stringify({
    contentId: content.id,
    contentTitle: content.title,
    topicId: content.topicId,
    topicName: content.topic?.name || '',
    chapterName: content.topic?.chapter?.name || '',
  });

  // Delete existing embeddings for this content
  await prisma.$executeRawUnsafe(
    `DELETE FROM content_embeddings WHERE content_id = $1`,
    contentId
  );

  // Chunk and embed
  const chunks = chunkText(textToEmbed);
  logger.info(`Generating ${chunks.length} embeddings for content ${contentId}`);

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await generateEmbedding(chunks[i], apiKey);
      const embeddingStr = `[${embedding.join(',')}]`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO content_embeddings (content_id, batch_id, chunk_index, chunk_text, source_field, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::vector, $7::jsonb)
         ON CONFLICT (content_id, source_field, chunk_index)
         DO UPDATE SET chunk_text = $4, embedding = $6::vector, metadata = $7::jsonb, updated_at = NOW()`,
        contentId,
        batchId,
        i,
        chunks[i],
        'extractedText',
        embeddingStr,
        metadata
      );

      // Rate limit: small delay between API calls
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      logger.error(`Failed to embed chunk ${i} for content ${contentId}: ${error.message}`);
    }
  }

  logger.info(`Successfully embedded ${chunks.length} chunks for content ${contentId}`);
}

/**
 * Delete all embeddings for a content record.
 */
export async function deleteContentEmbeddings(contentId: string): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM content_embeddings WHERE content_id = $1`,
      contentId
    );
  } catch (error: any) {
    logger.error(`Failed to delete embeddings for content ${contentId}: ${error.message}`);
  }
}

// ── High-level: extract text + embed (fire-and-forget from controller) ──────

/**
 * Extract text from content and generate embeddings.
 * Called asynchronously after content create/update.
 */
export async function extractAndEmbed(
  contentId: string,
  batchId: string,
  orgId: string
): Promise<void> {
  try {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });
    if (!content) return;

    // Extract text based on content type
    const extractedText = await extractContentText({
      type: content.type,
      videoUrl: content.videoUrl,
      pdfUrl: content.pdfUrl,
      markdownBody: content.markdownBody,
      externalUrl: content.externalUrl,
      title: content.title,
      description: content.description,
    });

    // Save extracted text to DB
    if (extractedText) {
      await prisma.content.update({
        where: { id: contentId },
        data: { extractedText },
      });
    }

    // Generate and store embeddings
    await upsertContentEmbeddings(contentId, batchId, orgId);
  } catch (error: any) {
    logger.error(`extractAndEmbed failed for content ${contentId}: ${error.message}`);
  }
}
