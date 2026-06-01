-- AlterTable
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "certificateHeading" TEXT;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "certificatePrimaryColor" TEXT;
ALTER TABLE "batches" ADD COLUMN IF NOT EXISTS "certificateSecondaryColor" TEXT;
