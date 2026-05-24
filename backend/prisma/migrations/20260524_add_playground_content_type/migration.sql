DO $$
BEGIN
  BEGIN
    ALTER TYPE "ContentType" ADD VALUE 'PLAYGROUND';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

DO $$
BEGIN
  IF to_regclass('public.contents') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "contents" ADD COLUMN IF NOT EXISTS "playgroundId" TEXT';
  END IF;
END $$;
