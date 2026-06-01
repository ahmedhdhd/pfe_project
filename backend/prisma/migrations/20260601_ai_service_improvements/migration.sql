-- Drop quiz AI feedback (feature removed)
DROP TABLE IF EXISTS "quiz_ai_feedbacks";

-- Content embedding index status
CREATE TYPE "ContentEmbeddingStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'SKIPPED');

ALTER TABLE "contents"
  ADD COLUMN IF NOT EXISTS "embeddingIndexStatus" "ContentEmbeddingStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "embeddingIndexError" TEXT;

-- Schedule summary status (replaces error markers in aiSummary)
CREATE TYPE "ScheduleSummaryStatus" AS ENUM ('NONE', 'PENDING', 'READY', 'FAILED');

ALTER TABLE "schedules"
  ADD COLUMN IF NOT EXISTS "summaryStatus" "ScheduleSummaryStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "summaryError" TEXT;

-- Backfill: sessions that already have a real summary
UPDATE "schedules"
SET "summaryStatus" = 'READY'
WHERE "aiSummary" IS NOT NULL
  AND TRIM("aiSummary") <> ''
  AND "aiSummary" NOT LIKE '=== SUMMARY GENERATION ERROR ===%';

-- Backfill: prior error-in-summary rows
UPDATE "schedules"
SET
  "summaryStatus" = 'FAILED',
  "summaryError" = TRIM(SUBSTRING("aiSummary" FROM LENGTH('=== SUMMARY GENERATION ERROR ===') + 1))
WHERE "aiSummary" LIKE '=== SUMMARY GENERATION ERROR ===%';
