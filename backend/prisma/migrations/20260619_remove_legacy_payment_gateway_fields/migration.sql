-- Remove legacy per-organization payment credential storage
ALTER TABLE "organization_configs"
  DROP COLUMN IF EXISTS "razorpayKeyId",
  DROP COLUMN IF EXISTS "razorpayKeySecret",
  DROP COLUMN IF EXISTS "konnectApiKey",
  DROP COLUMN IF EXISTS "konnectWalletId",
  DROP COLUMN IF EXISTS "paymentGateway";
