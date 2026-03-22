-- Migration: Add per-company AI API provider settings and secret storage
-- Date: 2026-03-10

ALTER TABLE public.ai_settings
    ADD COLUMN IF NOT EXISTS api_provider text NOT NULL DEFAULT 'openai',
    ADD COLUMN IF NOT EXISTS api_base_url text NOT NULL DEFAULT 'https://api.openai.com/v1',
    ADD COLUMN IF NOT EXISTS api_key_last4 text,
    ADD COLUMN IF NOT EXISTS api_key_updated_at timestamptz;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ai_settings_api_provider_check'
          AND conrelid = 'public.ai_settings'::regclass
    ) THEN
        ALTER TABLE public.ai_settings
            ADD CONSTRAINT ai_settings_api_provider_check
            CHECK (api_provider IN ('openai', 'openrouter', 'custom'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.ai_api_credentials (
    company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    api_key text NOT NULL,
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_ai_api_credentials_updated_at ON public.ai_api_credentials;
CREATE TRIGGER trg_ai_api_credentials_updated_at
BEFORE UPDATE ON public.ai_api_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ai_api_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_api_credentials_no_direct_select" ON public.ai_api_credentials;
CREATE POLICY "ai_api_credentials_no_direct_select" ON public.ai_api_credentials
FOR SELECT TO authenticated
USING (false);

DROP POLICY IF EXISTS "ai_api_credentials_no_direct_modify" ON public.ai_api_credentials;
CREATE POLICY "ai_api_credentials_no_direct_modify" ON public.ai_api_credentials
FOR ALL TO authenticated
USING (false)
WITH CHECK (false);
