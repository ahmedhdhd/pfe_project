DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_configs' AND column_name = 'paymeeApiToken'
  ) THEN
    ALTER TABLE organization_configs DROP COLUMN "paymeeApiToken";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_configs' AND column_name = 'paymeeVendor'
  ) THEN
    ALTER TABLE organization_configs DROP COLUMN "paymeeVendor";
  END IF;
END $$;
