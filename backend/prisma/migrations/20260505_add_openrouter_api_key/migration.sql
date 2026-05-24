-- Add OpenRouter API key storage to organization configs
DO $$
BEGIN
  IF to_regclass('public.organization_configs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE organization_configs ADD COLUMN IF NOT EXISTS "openRouterApiKey" TEXT';
  END IF;
END $$;
