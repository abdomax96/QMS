-- Migration: Fix forms read policies for editor accounts
-- Purpose:
--   1) Allow report editors to read form_instances (required for refresh/hydration).
--   2) Allow editors to read generic/cell change logs (required for collaboration UI).
--   3) Keep permission checks department-scoped via check_forms_permission.
-- Date: 2026-02-23

BEGIN;

-- =====================================================
-- 1) form_instances SELECT: view OR edit
-- =====================================================

ALTER TABLE public.form_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_instances_select_matrix" ON public.form_instances;
CREATE POLICY "form_instances_select_matrix"
ON public.form_instances
FOR SELECT
TO authenticated
USING (
    public.check_forms_permission(auth.uid(), 'view', department_id)
    OR public.check_forms_permission(auth.uid(), 'edit', department_id)
);

-- =====================================================
-- 2) Generic change log SELECT policy: view OR edit
-- =====================================================

DO $$
BEGIN
    IF to_regclass('public.form_instance_change_log') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.form_instance_change_log ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "ficl_select_accessible_reports" ON public.form_instance_change_log';
        EXECUTE $policy$
            CREATE POLICY "ficl_select_accessible_reports"
            ON public.form_instance_change_log
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1
                    FROM public.form_instances fi
                    WHERE fi.id = form_instance_change_log.instance_id
                      AND (
                          public.check_forms_permission(auth.uid(), 'view', fi.department_id)
                          OR public.check_forms_permission(auth.uid(), 'edit', fi.department_id)
                      )
                )
            )
        $policy$;
    END IF;
END $$;

-- =====================================================
-- 3) cell_change_history SELECT policy: view OR edit
-- =====================================================

ALTER TABLE public.cell_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cell history of accessible forms" ON public.cell_change_history;
CREATE POLICY "Users can view cell history of accessible forms"
ON public.cell_change_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.form_instances fi
        WHERE fi.id = cell_change_history.instance_id
          AND (
              public.check_forms_permission(auth.uid(), 'view', fi.department_id)
              OR public.check_forms_permission(auth.uid(), 'edit', fi.department_id)
          )
    )
);

-- =====================================================
-- 4) RPC gate for generic change log: view OR edit
-- =====================================================

DO $$
BEGIN
    IF to_regclass('public.form_instance_change_log') IS NOT NULL THEN
        EXECUTE $function$
            CREATE OR REPLACE FUNCTION public.get_form_instance_change_log(
                p_instance_id uuid,
                p_limit integer DEFAULT 200,
                p_offset integer DEFAULT 0
            )
            RETURNS TABLE (
                id uuid,
                instance_id uuid,
                change_scope text,
                change_path text[],
                section_id text,
                table_id text,
                row_index integer,
                col_index integer,
                old_value jsonb,
                new_value jsonb,
                changed_by uuid,
                changed_by_name text,
                changed_at timestamptz,
                client_id text,
                source text
            )
            LANGUAGE plpgsql
            SET search_path TO 'public'
            AS $body$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM public.form_instances fi
                    WHERE fi.id = p_instance_id
                      AND (
                          public.check_forms_permission(auth.uid(), 'view', fi.department_id)
                          OR public.check_forms_permission(auth.uid(), 'edit', fi.department_id)
                      )
                ) THEN
                    RAISE EXCEPTION 'PERMISSION_DENIED: cannot access report change log';
                END IF;

                RETURN QUERY
                SELECT
                    l.id,
                    l.instance_id,
                    l.change_scope,
                    l.change_path,
                    l.section_id,
                    l.table_id,
                    l.row_index,
                    l.col_index,
                    l.old_value,
                    l.new_value,
                    l.changed_by,
                    l.changed_by_name,
                    l.changed_at,
                    l.client_id,
                    l.source
                FROM public.form_instance_change_log l
                WHERE l.instance_id = p_instance_id
                ORDER BY l.changed_at DESC
                LIMIT GREATEST(COALESCE(p_limit, 200), 1)
                OFFSET GREATEST(COALESCE(p_offset, 0), 0);
            END;
            $body$;
        $function$;
    END IF;
END $$;

COMMIT;
