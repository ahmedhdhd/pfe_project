-- Add payment gateway selection and Paymee credentials
ALTER TABLE organization_configs
ADD COLUMN IF NOT EXISTS "paymentGateway" TEXT DEFAULT 'konnect';

ALTER TABLE organization_configs
ADD COLUMN IF NOT EXISTS "paymeeApiToken" TEXT;

ALTER TABLE organization_configs
ADD COLUMN IF NOT EXISTS "paymeeVendor" TEXT;
