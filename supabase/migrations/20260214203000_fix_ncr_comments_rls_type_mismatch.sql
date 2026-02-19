-- Migration: Fix ncr_comments RLS type mismatch and defaults
-- Date: 2026-02-14
-- Why:
--   Some environments hit `operator does not exist: uuid <> text` when inserting NCR comments.
--   This migration normalizes ncr_comments policies with explicit casts and default filling.

SET app.bypass_permission_check = 'on';

-- Keep company_id and legacy/modern IDs aligned on write.
CREATE OR REPLACE FUNCTION public.ncr_comments_apply_defaults()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_company_id uuid;
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

    IF NEW.author_id IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.author_id := auth.uid()::text;
    END IF;

    IF NEW.company_id IS NULL THEN
        IF NEW.ncr_id IS NOT NULL THEN
            SELECT r.company_id
            INTO v_company_id
            FROM public.ncr_reports r
            WHERE r.id = NEW.ncr_id;
        END IF;

        IF v_company_id IS NULL THEN
            v_company_id := public.get_user_company_id();
        END IF;

        NEW.company_id := v_company_id;
    END IF;

    IF NEW.reactions IS NULL THEN
        NEW.reactions := '[]'::jsonb;
    END IF;

    IF NEW.attachments IS NULL THEN
        NEW.attachments := '[]'::jsonb;
    END IF;

    IF NEW.edited IS NULL THEN
        NEW.edited := false;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ncr_comments_apply_defaults ON public.ncr_comments;
CREATE TRIGGER trg_ncr_comments_apply_defaults
BEFORE INSERT OR UPDATE ON public.ncr_comments
FOR EACH ROW
EXECUTE FUNCTION public.ncr_comments_apply_defaults();

-- Backfill company_id where possible.
UPDATE public.ncr_comments c
SET company_id = r.company_id
FROM public.ncr_reports r
WHERE c.company_id IS NULL
  AND c.ncr_id = r.id;

-- Rebuild policies to avoid uuid/text operator mismatch across environments.
DO $$
DECLARE
    p record;
BEGIN
    FOR p IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ncr_comments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.ncr_comments', p.policyname);
    END LOOP;
END $$;

ALTER TABLE public.ncr_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ncr_comments_select_policy" ON public.ncr_comments
FOR SELECT TO authenticated
USING (
    public.check_ncr_permission(auth.uid(), 'view', NULL::text)
    AND (
        company_id IS NULL
        OR company_id = public.get_user_company_id()
        OR EXISTS (
            SELECT 1
            FROM public.ncr_reports r
            WHERE r.id = ncr_comments.ncr_id
              AND r.company_id = public.get_user_company_id()
        )
    )
);

CREATE POLICY "ncr_comments_insert_policy" ON public.ncr_comments
FOR INSERT TO authenticated
WITH CHECK (
    (
        public.check_ncr_permission(auth.uid(), 'comment', NULL::text)
        OR public.check_ncr_permission(auth.uid(), 'view', NULL::text)
    )
    AND (
        author_id IS NULL
        OR author_id::text = auth.uid()::text
    )
    AND (
        company_id IS NULL
        OR company_id = public.get_user_company_id()
    )
    AND (
        ncr_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.ncr_reports r
            WHERE r.id = ncr_comments.ncr_id
              AND r.company_id = public.get_user_company_id()
        )
    )
);

CREATE POLICY "ncr_comments_update_policy" ON public.ncr_comments
FOR UPDATE TO authenticated
USING (
    (
        author_id::text = auth.uid()::text
        OR public.check_ncr_permission(auth.uid(), 'edit', NULL::text)
        OR public.check_ncr_permission(auth.uid(), 'delete', NULL::text)
    )
    AND (
        company_id IS NULL
        OR company_id = public.get_user_company_id()
    )
)
WITH CHECK (
    (
        author_id::text = auth.uid()::text
        OR public.check_ncr_permission(auth.uid(), 'edit', NULL::text)
        OR public.check_ncr_permission(auth.uid(), 'delete', NULL::text)
    )
    AND (
        company_id IS NULL
        OR company_id = public.get_user_company_id()
    )
);

CREATE POLICY "ncr_comments_delete_policy" ON public.ncr_comments
FOR DELETE TO authenticated
USING (
    (
        author_id::text = auth.uid()::text
        OR public.check_ncr_permission(auth.uid(), 'delete', NULL::text)
    )
    AND (
        company_id IS NULL
        OR company_id = public.get_user_company_id()
    )
);

SET app.bypass_permission_check = 'off';
