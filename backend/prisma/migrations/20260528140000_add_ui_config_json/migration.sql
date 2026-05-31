-- Structured UI customization (design tokens + variants + presets)
ALTER TABLE "organization_configs" ADD COLUMN IF NOT EXISTS "uiConfigJson" JSONB;
