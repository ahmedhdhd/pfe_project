-- ============================================================
-- Migration: Add pgvector RAG support
-- ============================================================

-- 1. Enable pgvector extension (Supabase supports this natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Rename aiSummary → extractedText on contents table
ALTER TABLE contents RENAME COLUMN "aiSummary" TO "extractedText";

-- 3. Add geminiApiKey to organization_configs
ALTER TABLE organization_configs ADD COLUMN IF NOT EXISTS "geminiApiKey" TEXT;

-- 4. Create content_embeddings table for RAG
CREATE TABLE IF NOT EXISTS content_embeddings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    chunk_text TEXT NOT NULL,
    source_field TEXT NOT NULL,
    embedding vector(3072) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_batch ON content_embeddings(batch_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_content ON content_embeddings(content_id);

-- IVFFlat index for approximate nearest neighbor (cosine similarity)
-- NOTE: After initial data load, run: REINDEX INDEX idx_embeddings_vector;
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON content_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Prevent duplicate chunks
CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_unique
    ON content_embeddings(content_id, source_field, chunk_index);
