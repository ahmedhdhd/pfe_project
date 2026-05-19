-- Per-organization AI chat provider (gemini vs openrouter)
ALTER TABLE organization_configs
ADD COLUMN IF NOT EXISTS "aiChatProvider" TEXT;
