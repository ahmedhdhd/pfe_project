-- AI stack is OpenRouter-only; remove Gemini-era columns
DO $$
BEGIN
  IF to_regclass('public.organization_configs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "organization_configs" DROP COLUMN IF EXISTS "geminiApiKey"';
    EXECUTE 'ALTER TABLE "organization_configs" DROP COLUMN IF EXISTS "aiChatProvider"';
  END IF;
END $$;
