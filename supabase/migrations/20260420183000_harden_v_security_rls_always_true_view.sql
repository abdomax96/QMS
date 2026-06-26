-- Migration: Harden security audit view to run as invoker (not definer)
-- Date: 2026-04-20
-- Rationale: Supabase Advisor flags SECURITY DEFINER views because they can bypass the querying user's
--            permissions and RLS. This view is for internal security auditing; it should not run as definer.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_views
    WHERE schemaname = 'public'
      AND viewname = 'v_security_rls_always_true'
  ) THEN
    -- Ensure the view enforces the querying user's privileges/RLS, not the view owner's.
    EXECUTE 'ALTER VIEW public.v_security_rls_always_true SET (security_invoker = true)';

    -- This view is not intended for client-side usage; keep it restricted.
    EXECUTE 'REVOKE ALL ON public.v_security_rls_always_true FROM anon';
    EXECUTE 'REVOKE ALL ON public.v_security_rls_always_true FROM authenticated';
    EXECUTE 'GRANT SELECT ON public.v_security_rls_always_true TO service_role';
  END IF;
END $$;

COMMIT;

