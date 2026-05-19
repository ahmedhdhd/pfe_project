-- AI stack is OpenRouter-only; remove Gemini-era columns
ALTER TABLE "organization_configs" DROP COLUMN IF EXISTS "geminiApiKey";
ALTER TABLE "organization_configs" DROP COLUMN IF EXISTS "aiChatProvider";
