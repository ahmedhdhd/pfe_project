-- ============================================================
-- Migration: Add pgvector RAG support
-- ============================================================

-- 1. Enable pgvector extension (Supabase supports this natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Rename aiSummary -> extractedText on contents table (guarded for shadow DB)
DO $$
BEGIN
  IF to_regclass('public.contents') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'contents'
         AND column_name = 'aiSummary'
     ) THEN
    EXECUTE 'ALTER TABLE contents RENAME COLUMN "aiSummary" TO "extractedText"';
  END IF;
END $$;

-- 3. Add geminiApiKey to organization_configs
DO $$
BEGIN
  IF to_regclass('public.organization_configs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE organization_configs ADD COLUMN IF NOT EXISTS "geminiApiKey" TEXT';
  END IF;
END $$;

-- 4. Create content_embeddings table for RAG only when base tables exist
DO $$
BEGIN
  IF to_regclass('public.contents') IS NOT NULL
     AND to_regclass('public.batches') IS NOT NULL THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS content_embeddings (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
          batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL DEFAULT 0,
          chunk_text TEXT NOT NULL,
          source_field TEXT NOT NULL,
          embedding vector(3072) NOT NULL,
          metadata JSONB DEFAULT ''{}'',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_embeddings_batch ON content_embeddings(batch_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_embeddings_content ON content_embeddings(content_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_embeddings_unique ON content_embeddings(content_id, source_field, chunk_index)';
  END IF;
END $$;
