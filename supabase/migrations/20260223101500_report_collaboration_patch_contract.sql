-- Migration: Report collaboration patch contract and generic change log
-- Purpose:
--   1) Provide an RPC for partial report updates with optimistic version checks.
--   2) Persist immutable report change history across all report sections.
--   3) Align cell_change_history RLS with permission matrix + department scope.
-- Date: 2026-02-23

BEGIN;

-- =====================================================
-- 1) Generic report change log table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.form_instance_change_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id uuid NOT NULL REFERENCES public.form_instances(id) ON DELETE CASCADE,
    change_scope text NOT NULL CHECK (change_scope IN ('cell', 'table_notes', 'basic_field', 'section', 'other')),
    change_path text[] NOT NULL,
    section_id text,
    table_id text,
    row_index integer,
    col_index integer,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid NOT NULL REFERENCES public.users(id),
    changed_by_name text NOT NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    client_id text,
    source text NOT NULL DEFAULT 'editor',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT form_instance_change_log_cell_location_check CHECK (
        (change_scope <> 'cell')
        OR (
            section_id IS NOT NULL
            AND table_id IS NOT NULL
            AND row_index IS NOT NULL
            AND col_index IS NOT NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_ficl_instance_time
    ON public.form_instance_change_log(instance_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ficl_changed_by
    ON public.form_instance_change_log(changed_by);

CREATE INDEX IF NOT EXISTS idx_ficl_scope
    ON public.form_instance_change_log(change_scope);

CREATE INDEX IF NOT EXISTS idx_ficl_cell_lookup
    ON public.form_instance_change_log(instance_id, section_id, table_id, row_index, col_index)
    WHERE change_scope = 'cell';

COMMENT ON TABLE public.form_instance_change_log IS
'Immutable generic report change history for collaboration and audit.';

COMMENT ON COLUMN public.form_instance_change_log.change_path IS
'JSON path within form_data (text[]), e.g. {sections,section-1,tables,table-1,data,0,1}';

-- =====================================================
-- 2) RLS for generic report change log
-- =====================================================

ALTER TABLE public.form_instance_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ficl_select_accessible_reports" ON public.form_instance_change_log;
CREATE POLICY "ficl_select_accessible_reports"
ON public.form_instance_change_log
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.form_instances fi
        WHERE fi.id = form_instance_change_log.instance_id
          AND public.check_forms_permission(auth.uid(), 'view', fi.department_id)
    )
);

DROP POLICY IF EXISTS "ficl_insert_editable_reports" ON public.form_instance_change_log;
CREATE POLICY "ficl_insert_editable_reports"
ON public.form_instance_change_log
FOR INSERT
WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.form_instances fi
        WHERE fi.id = form_instance_change_log.instance_id
          AND fi.status IN ('draft', 'in_progress', 'rejected')
          AND public.check_forms_permission(auth.uid(), 'edit', fi.department_id)
    )
);

DROP POLICY IF EXISTS "ficl_update_blocked" ON public.form_instance_change_log;
CREATE POLICY "ficl_update_blocked"
ON public.form_instance_change_log
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "ficl_delete_blocked" ON public.form_instance_change_log;
CREATE POLICY "ficl_delete_blocked"
ON public.form_instance_change_log
FOR DELETE
USING (false);

-- =====================================================
-- 3) Align existing cell_change_history RLS with matrix permissions
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
          AND public.check_forms_permission(auth.uid(), 'view', fi.department_id)
    )
);

DROP POLICY IF EXISTS "Users can record changes to editable forms" ON public.cell_change_history;
CREATE POLICY "Users can record changes to editable forms"
ON public.cell_change_history
FOR INSERT
WITH CHECK (
    changed_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.form_instances fi
        WHERE fi.id = cell_change_history.instance_id
          AND fi.status IN ('draft', 'in_progress', 'rejected')
          AND public.check_forms_permission(auth.uid(), 'edit', fi.department_id)
    )
);

-- =====================================================
-- 4) RPC: apply partial patch to report + log change
-- =====================================================

CREATE OR REPLACE FUNCTION public.apply_form_instance_patch(
    p_instance_id uuid,
    p_expected_version integer DEFAULT NULL,
    p_change_scope text DEFAULT 'other',
    p_change_path text[] DEFAULT NULL,
    p_new_value jsonb DEFAULT NULL,
    p_old_value jsonb DEFAULT NULL,
    p_section_id text DEFAULT NULL,
    p_table_id text DEFAULT NULL,
    p_row_index integer DEFAULT NULL,
    p_col_index integer DEFAULT NULL,
    p_client_id text DEFAULT NULL,
    p_source text DEFAULT 'editor'
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_instance public.form_instances%ROWTYPE;
    v_previous_value jsonb;
    v_new_version integer;
    v_updated_at timestamptz;
    v_changed_at timestamptz;
    v_changed_by_name text;
    v_cell_change_type text;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED: authentication is required';
    END IF;

    IF p_change_path IS NULL OR array_length(p_change_path, 1) IS NULL THEN
        RAISE EXCEPTION 'INVALID_PATCH: change_path is required';
    END IF;

    IF p_change_scope IS NULL OR p_change_scope NOT IN ('cell', 'table_notes', 'basic_field', 'section', 'other') THEN
        RAISE EXCEPTION 'INVALID_SCOPE: unsupported scope %', p_change_scope;
    END IF;

    IF p_change_scope = 'cell' AND (
        p_section_id IS NULL OR p_table_id IS NULL OR p_row_index IS NULL OR p_col_index IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_CELL_PATCH: section/table/row/col are required for cell scope';
    END IF;

    SELECT *
    INTO v_instance
    FROM public.form_instances
    WHERE id = p_instance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: report % does not exist', p_instance_id;
    END IF;

    IF NOT public.check_forms_permission(v_user_id, 'edit', v_instance.department_id) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: edit permission is required for this report';
    END IF;

    IF v_instance.status NOT IN ('draft', 'in_progress', 'rejected') THEN
        RAISE EXCEPTION 'REPORT_NOT_EDITABLE: report status % is not editable', v_instance.status;
    END IF;

    IF p_expected_version IS NOT NULL AND v_instance.version <> p_expected_version THEN
        RETURN jsonb_build_object(
            'success', false,
            'conflict', true,
            'message', 'VERSION_CONFLICT',
            'currentVersion', v_instance.version,
            'expectedVersion', p_expected_version
        );
    END IF;

    v_previous_value := COALESCE(v_instance.form_data, '{}'::jsonb) #> p_change_path;

    UPDATE public.form_instances fi
    SET form_data = jsonb_set(
        COALESCE(fi.form_data, '{}'::jsonb),
        p_change_path,
        COALESCE(p_new_value, 'null'::jsonb),
        true
    )
    WHERE fi.id = p_instance_id
    RETURNING fi.version, fi.updated_at
    INTO v_new_version, v_updated_at;

    SELECT COALESCE(u.name, u.email, v_user_id::text)
    INTO v_changed_by_name
    FROM public.users u
    WHERE u.id = v_user_id;

    INSERT INTO public.form_instance_change_log (
        instance_id,
        change_scope,
        change_path,
        section_id,
        table_id,
        row_index,
        col_index,
        old_value,
        new_value,
        changed_by,
        changed_by_name,
        client_id,
        source
    ) VALUES (
        p_instance_id,
        p_change_scope,
        p_change_path,
        p_section_id,
        p_table_id,
        p_row_index,
        p_col_index,
        COALESCE(p_old_value, v_previous_value),
        p_new_value,
        v_user_id,
        v_changed_by_name,
        p_client_id,
        COALESCE(NULLIF(trim(p_source), ''), 'editor')
    )
    RETURNING changed_at INTO v_changed_at;

    IF p_change_scope = 'cell' THEN
        v_cell_change_type := CASE
            WHEN COALESCE(p_old_value, v_previous_value) IS NULL THEN 'create'
            WHEN p_new_value IS NULL THEN 'delete'
            ELSE 'update'
        END;

        INSERT INTO public.cell_change_history (
            instance_id,
            section_id,
            table_id,
            row_index,
            col_index,
            old_value,
            new_value,
            changed_by,
            changed_by_name,
            change_type,
            client_id
        ) VALUES (
            p_instance_id,
            p_section_id,
            p_table_id,
            p_row_index,
            p_col_index,
            COALESCE(p_old_value, v_previous_value),
            p_new_value,
            v_user_id,
            v_changed_by_name,
            v_cell_change_type,
            p_client_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'conflict', false,
        'message', 'OK',
        'newVersion', v_new_version,
        'updatedAt', v_updated_at,
        'changedAt', v_changed_at
    );
END;
$$;

COMMENT ON FUNCTION public.apply_form_instance_patch IS
'Applies partial form_data patch with optimistic version checks and immutable change logging.';

-- =====================================================
-- 5) RPC: read generic report change log
-- =====================================================

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
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.form_instances fi
        WHERE fi.id = p_instance_id
          AND public.check_forms_permission(auth.uid(), 'view', fi.department_id)
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
$$;

COMMENT ON FUNCTION public.get_form_instance_change_log IS
'Returns report-level immutable change history for authorized users.';

-- =====================================================
-- 6) Grants
-- =====================================================

GRANT SELECT, INSERT ON TABLE public.form_instance_change_log TO authenticated;
GRANT ALL ON TABLE public.form_instance_change_log TO service_role;

GRANT EXECUTE ON FUNCTION public.apply_form_instance_patch(
    uuid,
    integer,
    text,
    text[],
    jsonb,
    jsonb,
    text,
    text,
    integer,
    integer,
    text,
    text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.apply_form_instance_patch(
    uuid,
    integer,
    text,
    text[],
    jsonb,
    jsonb,
    text,
    text,
    integer,
    integer,
    text,
    text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_form_instance_change_log(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_form_instance_change_log(uuid, integer, integer) TO service_role;

COMMIT;
