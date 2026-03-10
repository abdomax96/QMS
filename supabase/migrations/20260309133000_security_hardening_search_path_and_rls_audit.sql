-- ============================================================
-- Security hardening bootstrap
-- 1) Fix mutable function search_path warnings (linter 0011)
-- 2) Add an audit view for overly permissive RLS policies
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Fix functions with mutable search_path in public schema
-- ------------------------------------------------------------
DO $$
DECLARE
    fn record;
    fixed_count integer := 0;
    skipped_count integer := 0;
BEGIN
    FOR fn IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS function_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE p.prokind = 'f'
          AND n.nspname = 'public'
          AND NOT EXISTS (
              SELECT 1
              FROM pg_depend d
              JOIN pg_extension e ON e.oid = d.refobjid
              WHERE d.classid = 'pg_proc'::regclass
                AND d.objid = p.oid
                AND d.deptype = 'e'
          )
          AND NOT EXISTS (
              SELECT 1
              FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) cfg
              WHERE cfg LIKE 'search_path=%'
          )
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
                fn.schema_name,
                fn.function_name,
                fn.function_args
            );
            fixed_count := fixed_count + 1;
        EXCEPTION
            WHEN insufficient_privilege THEN
                skipped_count := skipped_count + 1;
                RAISE NOTICE '[security] skipped function due to ownership/privilege: %.%(%)',
                    fn.schema_name,
                    fn.function_name,
                    fn.function_args;
        END;
    END LOOP;

    RAISE NOTICE '[security] functions search_path hardened: %', fixed_count;
    RAISE NOTICE '[security] functions skipped: %', skipped_count;
END $$;

-- ------------------------------------------------------------
-- 2) Audit view: RLS policies that are effectively always true
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_security_rls_always_true AS
WITH base AS (
    SELECT
        schemaname,
        tablename,
        policyname,
        cmd,
        roles,
        COALESCE(trim(qual), '') AS using_expr,
        COALESCE(trim(with_check), '') AS with_check_expr
    FROM pg_policies
    WHERE schemaname = 'public'
),
normalized AS (
    SELECT
        schemaname,
        tablename,
        policyname,
        cmd,
        roles,
        using_expr,
        with_check_expr,
        lower(replace(replace(using_expr, '(', ''), ')', '')) = 'true' AS using_is_true,
        lower(replace(replace(with_check_expr, '(', ''), ')', '')) = 'true' AS with_check_is_true
    FROM base
)
SELECT
    schemaname,
    tablename,
    policyname,
    cmd,
    roles,
    using_expr,
    with_check_expr,
    using_is_true,
    with_check_is_true,
    CASE
        WHEN cmd = 'ALL' AND using_is_true AND with_check_is_true THEN 'critical'
        WHEN cmd = 'UPDATE' AND using_is_true AND with_check_is_true THEN 'critical'
        WHEN cmd = 'DELETE' AND using_is_true THEN 'high'
        WHEN cmd = 'INSERT' AND with_check_is_true THEN 'high'
        WHEN cmd = 'UPDATE' AND (using_is_true OR with_check_is_true) THEN 'high'
        ELSE 'medium'
    END AS severity
FROM normalized
WHERE cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  AND (
      (cmd IN ('ALL', 'UPDATE', 'DELETE') AND using_is_true)
      OR
      (cmd IN ('ALL', 'INSERT', 'UPDATE') AND with_check_is_true)
  );

COMMENT ON VIEW public.v_security_rls_always_true IS
'Security audit view: flags public schema RLS policies where USING/WITH CHECK evaluate to true (overly permissive).';

COMMIT;
