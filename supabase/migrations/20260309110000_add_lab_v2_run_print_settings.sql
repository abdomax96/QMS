-- ============================================================
-- Lab V2 Run Print Settings
-- Header metadata for printable moisture sheet in /lab/tests/runs
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.lab_v2_print_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_title text NOT NULL DEFAULT 'نموذج تسجيل فحص الرطوبة',
    doc_code text NOT NULL DEFAULT 'LAB-TEST-RUN-01',
    issue_no text NOT NULL DEFAULT '01',
    issue_date text NULL DEFAULT '',
    review_no text NOT NULL DEFAULT '00',
    review_date text NULL DEFAULT '',
    footer_note text NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid NULL,
    updated_by uuid NULL,
    CONSTRAINT lab_v2_print_settings_company_unique UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_v2_print_settings_company_id
    ON public.lab_v2_print_settings(company_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_lab_v2_print_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_lab_v2_print_settings_updated_at
        BEFORE UPDATE ON public.lab_v2_print_settings
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END$$;

ALTER TABLE public.lab_v2_print_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_v2_print_settings_select_authenticated ON public.lab_v2_print_settings;
DROP POLICY IF EXISTS lab_v2_print_settings_modify_authenticated ON public.lab_v2_print_settings;

CREATE POLICY lab_v2_print_settings_select_authenticated
ON public.lab_v2_print_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY lab_v2_print_settings_modify_authenticated
ON public.lab_v2_print_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT ON public.lab_v2_print_settings TO authenticated;
GRANT ALL ON public.lab_v2_print_settings TO service_role;

INSERT INTO public.lab_v2_print_settings (
    company_id,
    document_title,
    doc_code,
    issue_no,
    issue_date,
    review_no,
    review_date,
    footer_note
)
SELECT
    s.main_company_id,
    'نموذج تسجيل فحص الرطوبة',
    'LAB-TEST-RUN-01',
    '01',
    '',
    '00',
    '',
    ''
FROM public.settings s
WHERE s.id = 'global'
  AND s.main_company_id IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

COMMIT;
