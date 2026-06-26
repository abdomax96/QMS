-- Migration: Fix get_user_company_id() to avoid NULL company in RLS checks
-- Date: 2026-04-20
-- Problem: public.get_user_company_id() returns NULL when public.users.company_id is NULL or user profile row is missing,
--          which causes RLS INSERT checks (e.g. material_receiving) to fail when the app sends a non-null company_id.
-- Solution: Prefer the user's explicit company_id, otherwise fallback to settings.main_company_id (global tenant).
--           Optionally backfill missing users.company_id from settings.main_company_id when available.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT u.company_id FROM public.users u WHERE u.id = auth.uid()),
    (SELECT s.main_company_id FROM public.settings s WHERE s.id = 'global')
  );
$$;

DO $$
DECLARE
  v_main_company_id uuid;
BEGIN
  -- Backfill only when a main company is configured.
  SELECT s.main_company_id
    INTO v_main_company_id
  FROM public.settings s
  WHERE s.id = 'global';

  IF v_main_company_id IS NOT NULL THEN
    UPDATE public.users u
       SET company_id = v_main_company_id,
           updated_at = now()
     WHERE u.company_id IS NULL;
  END IF;
END $$;

COMMIT;

