-- Add OpenRouter API key storage to organization configs
ALTER TABLE organization_configs
ADD COLUMN IF NOT EXISTS "openRouterApiKey" TEXT;
