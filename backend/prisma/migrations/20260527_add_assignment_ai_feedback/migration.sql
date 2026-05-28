-- Assignment-level adaptive AI feedback for submitted assignments.
CREATE TABLE IF NOT EXISTS "assignment_ai_feedbacks" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "scorePercent" DOUBLE PRECISION,
  "weakConceptsJson" JSONB NOT NULL DEFAULT '[]',
  "strengthsJson" JSONB NOT NULL DEFAULT '[]',
  "recommendationsJson" JSONB NOT NULL DEFAULT '[]',
  "questionFeedbackJson" JSONB NOT NULL DEFAULT '[]',
  "feedbackText" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "assignment_ai_feedbacks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "assignment_ai_feedbacks_submissionId_key"
  ON "assignment_ai_feedbacks"("submissionId");

CREATE INDEX IF NOT EXISTS "assignment_ai_feedbacks_studentId_assignmentId_idx"
  ON "assignment_ai_feedbacks"("studentId", "assignmentId");

CREATE INDEX IF NOT EXISTS "assignment_ai_feedbacks_batchId_idx"
  ON "assignment_ai_feedbacks"("batchId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_ai_feedbacks_submissionId_fkey'
  ) THEN
    ALTER TABLE "assignment_ai_feedbacks"
      ADD CONSTRAINT "assignment_ai_feedbacks_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "assignment_submissions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_ai_feedbacks_assignmentId_fkey'
  ) THEN
    ALTER TABLE "assignment_ai_feedbacks"
      ADD CONSTRAINT "assignment_ai_feedbacks_assignmentId_fkey"
      FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_ai_feedbacks_studentId_fkey'
  ) THEN
    ALTER TABLE "assignment_ai_feedbacks"
      ADD CONSTRAINT "assignment_ai_feedbacks_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'assignment_ai_feedbacks_batchId_fkey'
  ) THEN
    ALTER TABLE "assignment_ai_feedbacks"
      ADD CONSTRAINT "assignment_ai_feedbacks_batchId_fkey"
      FOREIGN KEY ("batchId") REFERENCES "batches"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
