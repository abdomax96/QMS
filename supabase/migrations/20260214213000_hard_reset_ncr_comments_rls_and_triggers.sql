-- Migration: Hard reset ncr_comments metadata (RLS/triggers/indexes) for type-drift safety
-- Date: 2026-02-14
-- Why:
--   Some environments still fail NCR comment inserts with:
--   `operator does not exist: uuid <> text`.
--   This migration force-normalizes ncr_comments metadata to remove drifted objects.

SET app.bypass_permission_check = 'on';

-- ---------------------------------------------------------------------------
-- 1) Normalize column types used by policies/frontend.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.ncr_comments
            ALTER COLUMN author_id TYPE text USING author_id::text;
    EXCEPTION WHEN others THEN
        RAISE NOTICE '[ncr_comments normalize] author_id cast skipped: %', SQLERRM;
    END;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Drop all user triggers on ncr_comments (drift cleanup), then recreate known ones.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT tgname
        FROM pg_trigger
        WHERE tgrelid = 'public.ncr_comments'::regclass
          AND NOT tgisinternal
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.ncr_comments', t.tgname);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Drop check constraints and non-primary indexes (drift cleanup), recreate known ones.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.ncr_comments'::regclass
          AND contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.ncr_comments DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;
END $$;

DO $$
DECLARE
    i record;
BEGIN
    FOR i IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'ncr_comments'
          AND indexname <> 'ncr_comments_pkey'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS public.%I', i.indexname);
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_ncr_comments_ncr ON public.ncr_comments(ncr_id);
CREATE INDEX IF NOT EXISTS idx_ncr_comments_entity ON public.ncr_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ncr_comments_company ON public.ncr_comments(company_id);

ALTER TABLE public.ncr_comments
    DROP CONSTRAINT IF EXISTS ncr_comments_entity_type_check;
ALTER TABLE public.ncr_comments
    ADD CONSTRAINT ncr_comments_entity_type_check
    CHECK (entity_type IN ('ncr', 'report', 'hold'));

-- ---------------------------------------------------------------------------
-- 4) Recreate compatibility/default triggers.
-- ---------------------------------------------------------------------------
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

    IF NEW.company_id IS NULL AND NEW.ncr_id IS NOT NULL THEN
        SELECT r.company_id
        INTO v_company_id
        FROM public.ncr_reports r
        WHERE r.id::text = NEW.ncr_id::text
        LIMIT 1;
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

CREATE TRIGGER trg_ncr_comments_sync_legacy_ids
BEFORE INSERT OR UPDATE ON public.ncr_comments
FOR EACH ROW
EXECUTE FUNCTION public.ncr_comments_sync_legacy_ids();

CREATE TRIGGER trg_ncr_comments_apply_defaults
BEFORE INSERT OR UPDATE ON public.ncr_comments
FOR EACH ROW
EXECUTE FUNCTION public.ncr_comments_apply_defaults();

-- ---------------------------------------------------------------------------
-- 5) Company helper with safe text casting.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ncr_comments_current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT u.company_id
FROM public.users u
WHERE u.id::text = auth.uid()::text
LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.ncr_comments_current_company_id() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Rebuild policies from scratch (no check_ncr_permission dependency).
-- ---------------------------------------------------------------------------
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
    (
        company_id IS NULL
        OR company_id = public.ncr_comments_current_company_id()
    )
    AND (
        ncr_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.ncr_reports r
            WHERE r.id::text = ncr_comments.ncr_id::text
              AND (
                  r.company_id = public.ncr_comments_current_company_id()
                  OR ncr_comments_current_company_id() IS NULL
              )
        )
    )
);

CREATE POLICY "ncr_comments_insert_policy" ON public.ncr_comments
FOR INSERT TO authenticated
WITH CHECK (
    (
        author_id IS NULL
        OR author_id::text = auth.uid()::text
    )
    AND (
        company_id IS NULL
        OR company_id = public.ncr_comments_current_company_id()
        OR public.ncr_comments_current_company_id() IS NULL
    )
    AND (
        ncr_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.ncr_reports r
            WHERE r.id::text = ncr_comments.ncr_id::text
              AND (
                  r.company_id = public.ncr_comments_current_company_id()
                  OR ncr_comments_current_company_id() IS NULL
              )
        )
    )
);

CREATE POLICY "ncr_comments_update_policy" ON public.ncr_comments
FOR UPDATE TO authenticated
USING (
    author_id::text = auth.uid()::text
    AND (
        company_id IS NULL
        OR company_id = public.ncr_comments_current_company_id()
        OR public.ncr_comments_current_company_id() IS NULL
    )
)
WITH CHECK (
    author_id::text = auth.uid()::text
    AND (
        company_id IS NULL
        OR company_id = public.ncr_comments_current_company_id()
        OR public.ncr_comments_current_company_id() IS NULL
    )
);

CREATE POLICY "ncr_comments_delete_policy" ON public.ncr_comments
FOR DELETE TO authenticated
USING (
    author_id::text = auth.uid()::text
    AND (
        company_id IS NULL
        OR company_id = public.ncr_comments_current_company_id()
        OR public.ncr_comments_current_company_id() IS NULL
    )
);

SET app.bypass_permission_check = 'off';
