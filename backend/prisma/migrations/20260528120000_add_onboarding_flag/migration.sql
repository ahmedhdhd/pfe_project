-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "organization_configs" ADD COLUMN IF NOT EXISTS "themeColor" TEXT;
ALTER TABLE "organization_configs" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "organization_configs" ADD COLUMN IF NOT EXISTS "audienceType" TEXT;
ALTER TABLE "organization_configs" ADD COLUMN IF NOT EXISTS "platformType" TEXT;
