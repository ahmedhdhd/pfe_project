DO $$
BEGIN
  IF to_regclass('public.schedules') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "schedules" ADD COLUMN IF NOT EXISTS "egressId" TEXT';
  END IF;
END $$;
