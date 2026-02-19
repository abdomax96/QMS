-- Migration: Backfill users.company_id and enforce default assignment
-- Date: 2026-02-11
-- Why:
--   Chat user listing is company-scoped. Legacy user creation paths inserted users with
--   null company_id, causing "no available users" even when active users exist.
--
-- What this migration does:
--   1) Backfills users.company_id for existing rows where it is null.
--   2) Adds a trigger that auto-fills company_id on INSERT/UPDATE when omitted.

SET app.bypass_permission_check = 'on';

DO $$
DECLARE
    v_main_company_id uuid;
BEGIN
    SELECT s.main_company_id
    INTO v_main_company_id
    FROM public.settings s
    WHERE s.id = 'global';

    IF v_main_company_id IS NULL THEN
        SELECT c.id
        INTO v_main_company_id
        FROM public.companies c
        ORDER BY c.created_at NULLS LAST, c.id
        LIMIT 1;
    END IF;

    IF v_main_company_id IS NULL THEN
        RAISE EXCEPTION '[users company backfill] No company found in settings/companies.';
    END IF;

    UPDATE public.users
    SET
        company_id = v_main_company_id,
        updated_at = NOW()
    WHERE company_id IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.users_fill_company_id_default()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_main_company_id uuid;
BEGIN
    IF NEW.company_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT s.main_company_id
    INTO v_main_company_id
    FROM public.settings s
    WHERE s.id = 'global';

    IF v_main_company_id IS NULL THEN
        SELECT c.id
        INTO v_main_company_id
        FROM public.companies c
        ORDER BY c.created_at NULLS LAST, c.id
        LIMIT 1;
    END IF;

    IF v_main_company_id IS NULL THEN
        RAISE EXCEPTION '[users company default] Unable to determine company_id.';
    END IF;

    NEW.company_id := v_main_company_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_fill_company_id_default ON public.users;
CREATE TRIGGER trg_users_fill_company_id_default
BEFORE INSERT OR UPDATE OF company_id ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.users_fill_company_id_default();

SET app.bypass_permission_check = 'off';
