-- Per-organization AI chat provider (gemini vs openrouter)
DO $$
BEGIN
  IF to_regclass('public.organization_configs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE organization_configs ADD COLUMN IF NOT EXISTS "aiChatProvider" TEXT';
  END IF;
END $$;
