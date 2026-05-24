DO $$
BEGIN
  IF to_regclass('public.schedules') IS NOT NULL
     AND to_regclass('public.users') IS NOT NULL THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS "schedule_attendances" (
        "id" TEXT NOT NULL,
        "scheduleId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastJoinedAt" TIMESTAMP(3),
        "leftAt" TIMESTAMP(3),
        "durationMins" INTEGER NOT NULL DEFAULT 0,
        "isPresent" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "schedule_attendances_pkey" PRIMARY KEY ("id")
      )';

    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "schedule_attendances_scheduleId_userId_key" ON "schedule_attendances"("scheduleId", "userId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "schedule_attendances_scheduleId_idx" ON "schedule_attendances"("scheduleId")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "schedule_attendances_userId_idx" ON "schedule_attendances"("userId")';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'schedule_attendances_scheduleId_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE "schedule_attendances" ADD CONSTRAINT "schedule_attendances_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'schedule_attendances_userId_fkey'
    ) THEN
      EXECUTE 'ALTER TABLE "schedule_attendances" ADD CONSTRAINT "schedule_attendances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE';
    END IF;
  END IF;
END $$;
