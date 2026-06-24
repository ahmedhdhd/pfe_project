-- Add organization-level Stripe Connect fields while keeping Konnect as the default gateway
ALTER TABLE "organization_configs"
  ADD COLUMN IF NOT EXISTS "paymentGateway" TEXT DEFAULT 'KONNECT',
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "stripeConnectedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'organization_configs_stripeAccountId_key'
  ) THEN
    CREATE UNIQUE INDEX "organization_configs_stripeAccountId_key"
      ON "organization_configs" ("stripeAccountId");
  END IF;
END $$;
