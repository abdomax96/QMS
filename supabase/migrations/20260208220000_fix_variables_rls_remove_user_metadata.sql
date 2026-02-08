-- Migration: Fix variables RLS (remove user_metadata references)
-- Date: 2026-02-08
-- Why: Supabase linter 0015 flags `user_metadata` usage in RLS because end users can edit it.
-- Approach: Use `app_metadata.company_id` instead (non-user-editable), so RLS decisions are based on a trusted claim.
--
-- Prereq:
-- - Ensure each user has `app_metadata.company_id` set (UUID string).
--   After updating app_metadata, users must refresh their session (sign out/in) for JWT claims to update.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'variables'
  ) THEN
    RAISE NOTICE '[variables RLS] Table public.variables not found, skipping.';
    RETURN;
  END IF;

  -- Ensure RLS is enabled.
  EXECUTE 'ALTER TABLE public.variables ENABLE ROW LEVEL SECURITY';

  -- Drop the insecure policies (if they exist).
  EXECUTE 'DROP POLICY IF EXISTS "Users can view variables from their company" ON public.variables';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert variables for their company" ON public.variables';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update variables for their company" ON public.variables';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete variables for their company" ON public.variables';

  -- Recreate policies using app_metadata (trusted).
  -- Using text comparison avoids casting failures if company_id is missing/invalid.
  EXECUTE $sql$
    CREATE POLICY "Users can view variables from their company"
    ON public.variables
    FOR SELECT
    TO authenticated
    USING (company_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'company_id', ''))
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can insert variables for their company"
    ON public.variables
    FOR INSERT
    TO authenticated
    WITH CHECK (company_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'company_id', ''))
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can update variables for their company"
    ON public.variables
    FOR UPDATE
    TO authenticated
    USING (company_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'company_id', ''))
    WITH CHECK (company_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'company_id', ''))
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Users can delete variables for their company"
    ON public.variables
    FOR DELETE
    TO authenticated
    USING (company_id::text = COALESCE(auth.jwt() -> 'app_metadata' ->> 'company_id', ''))
  $sql$;

  RAISE NOTICE '[variables RLS] Policies updated to use app_metadata.company_id (no user_metadata).';
END $$;

