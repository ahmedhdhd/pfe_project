-- Add payment gateway selection and Paymee credentials
DO $$
BEGIN
  IF to_regclass('public.organization_configs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE organization_configs ADD COLUMN IF NOT EXISTS "paymentGateway" TEXT DEFAULT ''konnect''';
    EXECUTE 'ALTER TABLE organization_configs ADD COLUMN IF NOT EXISTS "paymeeApiToken" TEXT';
    EXECUTE 'ALTER TABLE organization_configs ADD COLUMN IF NOT EXISTS "paymeeVendor" TEXT';
  END IF;
END $$;
