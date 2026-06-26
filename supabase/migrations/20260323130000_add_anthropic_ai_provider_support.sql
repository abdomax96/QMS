-- Migration: Allow Anthropic (Claude) as an AI provider for the AI assistant
-- Date: 2026-03-23

ALTER TABLE public.ai_settings
    DROP CONSTRAINT IF EXISTS ai_settings_api_provider_check;

ALTER TABLE public.ai_settings
    ADD CONSTRAINT ai_settings_api_provider_check
    CHECK (api_provider IN ('openai', 'openrouter', 'google', 'anthropic', 'custom'));
