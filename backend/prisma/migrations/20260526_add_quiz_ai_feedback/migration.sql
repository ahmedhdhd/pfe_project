DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'topic_quiz_attempts'
  ) THEN
    CREATE TABLE IF NOT EXISTS "quiz_ai_feedbacks" (
      "id" TEXT NOT NULL,
      "quizAttemptId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "topicId" TEXT NOT NULL,
      "batchId" TEXT NOT NULL,
      "scorePercent" DOUBLE PRECISION NOT NULL,
      "weakConceptsJson" JSONB NOT NULL DEFAULT '[]',
      "strengthsJson" JSONB NOT NULL DEFAULT '[]',
      "recommendationsJson" JSONB NOT NULL DEFAULT '[]',
      "questionFeedbackJson" JSONB NOT NULL DEFAULT '[]',
      "feedbackText" TEXT NOT NULL,
      "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "quiz_ai_feedbacks_pkey" PRIMARY KEY ("id")
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "quiz_ai_feedbacks_quizAttemptId_key"
      ON "quiz_ai_feedbacks"("quizAttemptId");
    CREATE INDEX IF NOT EXISTS "quiz_ai_feedbacks_userId_topicId_idx"
      ON "quiz_ai_feedbacks"("userId", "topicId");
    CREATE INDEX IF NOT EXISTS "quiz_ai_feedbacks_batchId_idx"
      ON "quiz_ai_feedbacks"("batchId");

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'quiz_ai_feedbacks'
        AND constraint_name = 'quiz_ai_feedbacks_quizAttemptId_fkey'
    ) THEN
      ALTER TABLE "quiz_ai_feedbacks"
        ADD CONSTRAINT "quiz_ai_feedbacks_quizAttemptId_fkey"
        FOREIGN KEY ("quizAttemptId") REFERENCES "topic_quiz_attempts"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'quiz_ai_feedbacks'
        AND constraint_name = 'quiz_ai_feedbacks_userId_fkey'
    ) THEN
      ALTER TABLE "quiz_ai_feedbacks"
        ADD CONSTRAINT "quiz_ai_feedbacks_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'quiz_ai_feedbacks'
        AND constraint_name = 'quiz_ai_feedbacks_topicId_fkey'
    ) THEN
      ALTER TABLE "quiz_ai_feedbacks"
        ADD CONSTRAINT "quiz_ai_feedbacks_topicId_fkey"
        FOREIGN KEY ("topicId") REFERENCES "topics"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'quiz_ai_feedbacks'
        AND constraint_name = 'quiz_ai_feedbacks_batchId_fkey'
    ) THEN
      ALTER TABLE "quiz_ai_feedbacks"
        ADD CONSTRAINT "quiz_ai_feedbacks_batchId_fkey"
        FOREIGN KEY ("batchId") REFERENCES "batches"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;
