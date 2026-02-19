-- Migration: NCR enhancements (reference docs, comments compatibility, hold sorting logs)
-- Date: 2026-02-14
-- Why:
--   1) Persist reference SOP/WI links on NCR.
--   2) Fix comments compatibility between legacy and current frontend fields.
--   3) Add structured hold sorting tracking with timestamped entries.

SET app.bypass_permission_check = 'on';

-- ---------------------------------------------------------------------------
-- 1) Ensure NCR report columns used by frontend exist.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ncr_reports
    ADD COLUMN IF NOT EXISTS defect_id text,
    ADD COLUMN IF NOT EXISTS defect_type text,
    ADD COLUMN IF NOT EXISTS occurrence integer,
    ADD COLUMN IF NOT EXISTS detection integer,
    ADD COLUMN IF NOT EXISTS rpn integer,
    ADD COLUMN IF NOT EXISTS risk_band text,
    ADD COLUMN IF NOT EXISTS document_id uuid,
    ADD COLUMN IF NOT EXISTS document_title text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ncr_reports_document_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.ncr_reports
                ADD CONSTRAINT ncr_reports_document_id_fkey
                FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE SET NULL;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping ncr_reports_document_id_fkey: public.documents(id) is not unique in this environment.';
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ncr_reports_document_id ON public.ncr_reports(document_id);

UPDATE public.ncr_reports r
SET document_title = d.title
FROM public.documents d
WHERE r.document_id = d.id
  AND (r.document_title IS NULL OR btrim(r.document_title) = '');

-- ---------------------------------------------------------------------------
-- 2) Bring ncr_comments to unified shape (keep backward compatibility).
-- ---------------------------------------------------------------------------
ALTER TABLE public.ncr_comments
    ADD COLUMN IF NOT EXISTS entity_id uuid,
    ADD COLUMN IF NOT EXISTS entity_type text DEFAULT 'ncr',
    ADD COLUMN IF NOT EXISTS author_avatar text,
    ADD COLUMN IF NOT EXISTS edited boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS edited_at timestamptz,
    ADD COLUMN IF NOT EXISTS reactions jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS company_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ncr_comments_company_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.ncr_comments
                ADD CONSTRAINT ncr_comments_company_id_fkey
                FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping ncr_comments_company_id_fkey: public.companies(id) is not unique in this environment.';
        END;
    END IF;
END $$;

UPDATE public.ncr_comments
SET entity_id = ncr_id
WHERE entity_id IS NULL
  AND ncr_id IS NOT NULL;

UPDATE public.ncr_comments
SET entity_type = 'ncr'
WHERE entity_type IS NULL;

UPDATE public.ncr_comments c
SET company_id = r.company_id
FROM public.ncr_reports r
WHERE c.company_id IS NULL
  AND c.ncr_id = r.id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ncr_comments_entity_type_check'
    ) THEN
        ALTER TABLE public.ncr_comments
            ADD CONSTRAINT ncr_comments_entity_type_check
            CHECK (entity_type IN ('ncr', 'report', 'hold'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ncr_comments_entity ON public.ncr_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ncr_comments_company ON public.ncr_comments(company_id);

CREATE OR REPLACE FUNCTION public.ncr_comments_sync_legacy_ids()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.entity_type IS NULL THEN
        NEW.entity_type := 'ncr';
    END IF;

    IF NEW.entity_id IS NULL AND NEW.ncr_id IS NOT NULL THEN
        NEW.entity_id := NEW.ncr_id;
    END IF;

    IF NEW.ncr_id IS NULL AND NEW.entity_type = 'ncr' AND NEW.entity_id IS NOT NULL THEN
        NEW.ncr_id := NEW.entity_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ncr_comments_sync_legacy_ids ON public.ncr_comments;
CREATE TRIGGER trg_ncr_comments_sync_legacy_ids
BEFORE INSERT OR UPDATE ON public.ncr_comments
FOR EACH ROW
EXECUTE FUNCTION public.ncr_comments_sync_legacy_ids();

-- ---------------------------------------------------------------------------
-- 3) New structured hold sorting logs.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ncr_hold_sort_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    ncr_id uuid NOT NULL,
    sorted_qty numeric(18,4) NOT NULL CHECK (sorted_qty > 0),
    destroyed_qty numeric(18,4) NOT NULL DEFAULT 0 CHECK (destroyed_qty >= 0),
    sorted_at timestamptz NOT NULL DEFAULT NOW(),
    sorted_by uuid,
    notes text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT ncr_hold_sort_logs_destroyed_lte_sorted CHECK (destroyed_qty <= sorted_qty)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ncr_hold_sort_logs_company_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.ncr_hold_sort_logs
                ADD CONSTRAINT ncr_hold_sort_logs_company_id_fkey
                FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping ncr_hold_sort_logs_company_id_fkey: public.companies(id) is not unique in this environment.';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ncr_hold_sort_logs_ncr_id_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.ncr_hold_sort_logs
                ADD CONSTRAINT ncr_hold_sort_logs_ncr_id_fkey
                FOREIGN KEY (ncr_id) REFERENCES public.ncr_reports(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping ncr_hold_sort_logs_ncr_id_fkey: public.ncr_reports(id) is not unique in this environment.';
        END;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'ncr_hold_sort_logs_sorted_by_fkey'
    ) THEN
        BEGIN
            ALTER TABLE public.ncr_hold_sort_logs
                ADD CONSTRAINT ncr_hold_sort_logs_sorted_by_fkey
                FOREIGN KEY (sorted_by) REFERENCES public.users(id) ON DELETE SET NULL;
        EXCEPTION
            WHEN SQLSTATE '42830' THEN
                RAISE NOTICE 'Skipping ncr_hold_sort_logs_sorted_by_fkey: public.users(id) is not unique in this environment.';
        END;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ncr_hold_sort_logs_ncr_id ON public.ncr_hold_sort_logs(ncr_id);
CREATE INDEX IF NOT EXISTS idx_ncr_hold_sort_logs_company_id ON public.ncr_hold_sort_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ncr_hold_sort_logs_sorted_at ON public.ncr_hold_sort_logs(sorted_at DESC);

CREATE OR REPLACE FUNCTION public.ncr_hold_sort_logs_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ncr_hold_sort_logs_updated_at ON public.ncr_hold_sort_logs;
CREATE TRIGGER trg_ncr_hold_sort_logs_updated_at
BEFORE UPDATE ON public.ncr_hold_sort_logs
FOR EACH ROW
EXECUTE FUNCTION public.ncr_hold_sort_logs_set_updated_at();

ALTER TABLE public.ncr_hold_sort_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ncr_hold_sort_logs_select_policy" ON public.ncr_hold_sort_logs;
CREATE POLICY "ncr_hold_sort_logs_select_policy" ON public.ncr_hold_sort_logs
FOR SELECT TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.check_ncr_permission(auth.uid(), 'view', NULL::text)
);

DROP POLICY IF EXISTS "ncr_hold_sort_logs_insert_policy" ON public.ncr_hold_sort_logs;
CREATE POLICY "ncr_hold_sort_logs_insert_policy" ON public.ncr_hold_sort_logs
FOR INSERT TO authenticated
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.check_ncr_permission(auth.uid(), 'edit', NULL::text)
);

DROP POLICY IF EXISTS "ncr_hold_sort_logs_update_policy" ON public.ncr_hold_sort_logs;
CREATE POLICY "ncr_hold_sort_logs_update_policy" ON public.ncr_hold_sort_logs
FOR UPDATE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.check_ncr_permission(auth.uid(), 'edit', NULL::text)
)
WITH CHECK (
    company_id = public.get_user_company_id()
    AND public.check_ncr_permission(auth.uid(), 'edit', NULL::text)
);

DROP POLICY IF EXISTS "ncr_hold_sort_logs_delete_policy" ON public.ncr_hold_sort_logs;
CREATE POLICY "ncr_hold_sort_logs_delete_policy" ON public.ncr_hold_sort_logs
FOR DELETE TO authenticated
USING (
    company_id = public.get_user_company_id()
    AND public.check_ncr_permission(auth.uid(), 'delete', NULL::text)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    ) THEN
        RAISE NOTICE 'Publication supabase_realtime does not exist; skipping ncr_hold_sort_logs realtime publication binding.';
        RETURN;
    END IF;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.ncr_hold_sort_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

SET app.bypass_permission_check = 'off';
