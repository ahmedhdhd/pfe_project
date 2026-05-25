DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'schedules'
  ) THEN
    EXECUTE 'ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "transcriptDraft" TEXT';
    EXECUTE 'ALTER TABLE "schedules" DROP COLUMN IF EXISTS "egressId"';
  END IF;
END $$;
