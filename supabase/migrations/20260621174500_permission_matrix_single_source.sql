-- Permission matrix cleanup: Supabase is the single source of truth.
-- Dev-first migration. Do not apply to production without explicit approval.

SET app.bypass_permission_check = 'on';

-- Keep the module metadata aligned with the canonical NCR stage-action contract.
UPDATE public.app_modules
SET available_actions = ARRAY[
    'view',
    'create',
    'edit',
    'delete',
    'root_cause.propose',
    'assign',
    'approve',
    'release_hold',
    'reject',
    'verify_close',
    'export',
    'reopen',
    'capa.add',
    'capa.complete',
    'workflow.progress'
]::text[]
WHERE code = 'ncr';

-- Normalize old NCR action names stored in existing stage permission rows.
UPDATE public.ncr_stage_permissions nsp
SET allowed_actions = (
    WITH allowed_for_stage AS (
        SELECT CASE nsp.stage_code
            WHEN 'initial_report' THEN ARRAY['view', 'edit', 'delete', 'workflow.progress']::text[]
            WHEN 'root_cause_analysis' THEN ARRAY['view', 'edit', 'root_cause.propose', 'assign', 'approve', 'reject', 'workflow.progress', 'reopen']::text[]
            WHEN 'capa_planning' THEN ARRAY['view', 'edit', 'capa.add', 'approve', 'reject', 'workflow.progress', 'reopen']::text[]
            WHEN 'capa_execution' THEN ARRAY['view', 'edit', 'capa.complete', 'release_hold', 'workflow.progress', 'reopen']::text[]
            WHEN 'verification_closure' THEN ARRAY['view', 'verify_close', 'export', 'reopen']::text[]
            ELSE ARRAY['view']::text[]
        END AS actions
    ),
    mapped AS (
        SELECT DISTINCT CASE action_code
            WHEN 'add_rca' THEN 'root_cause.propose'
            WHEN 'hold_add' THEN 'capa.add'
            WHEN 'hold_release' THEN 'release_hold'
            WHEN 'update_progress' THEN 'capa.complete'
            WHEN 'verify' THEN 'verify_close'
            WHEN 'print' THEN NULL
            WHEN 'review' THEN NULL
            WHEN 'investigate' THEN NULL
            WHEN 'decide' THEN NULL
            WHEN 'close' THEN NULL
            ELSE action_code
        END AS action_code
        FROM unnest(COALESCE(nsp.allowed_actions, ARRAY[]::text[])) AS action_code
        UNION
        SELECT 'workflow.progress'
        WHERE COALESCE(nsp.can_advance, false) = true
        UNION
        SELECT 'view'
    )
    SELECT ARRAY(
        SELECT action_code
        FROM mapped, allowed_for_stage
        WHERE action_code IS NOT NULL
          AND action_code = ANY(allowed_for_stage.actions)
        ORDER BY array_position(allowed_for_stage.actions, action_code)
    )
)
WHERE nsp.stage_code IN (
    'initial_report',
    'root_cause_analysis',
    'capa_planning',
    'capa_execution',
    'verification_closure'
);

CREATE OR REPLACE FUNCTION public.check_matrix_permission(
    p_user_id uuid,
    p_module_code text,
    p_action text,
    p_stage_code text DEFAULT NULL::text,
    p_entity_department_id uuid DEFAULT NULL::uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_has_permission boolean := false;
BEGIN
    IF current_setting('app.bypass_permission_check', true) = 'on' THEN
        RETURN true;
    END IF;

    IF p_user_id IS NULL OR p_module_code IS NULL OR p_action IS NULL THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND rmp.module_code = p_module_code
          AND p_action = ANY(COALESCE(rmp.granted_actions, ARRAY[]::text[]))
    ) INTO v_has_permission;

    IF NOT v_has_permission AND p_module_code = 'ncr' AND p_stage_code IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.ncr_stage_permissions nsp ON nsp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND nsp.is_active = true
              AND nsp.department_id IS NULL
              AND nsp.stage_code = p_stage_code
              AND (
                    p_action = ANY(COALESCE(nsp.allowed_actions, ARRAY[]::text[]))
                    OR (p_action = 'workflow.progress' AND COALESCE(nsp.can_advance, false))
                    OR (p_action = 'workflow.return' AND COALESCE(nsp.can_return, false))
              )
        ) INTO v_has_permission;
    END IF;

    IF NOT v_has_permission AND p_module_code = 'tasks' AND p_stage_code IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.task_stage_permissions tsp ON tsp.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND tsp.is_active = true
              AND tsp.department_id IS NULL
              AND tsp.stage_code = p_stage_code
              AND (
                    p_action = ANY(COALESCE(tsp.allowed_actions, ARRAY[]::text[]))
                    OR (p_action = 'workflow.progress' AND COALESCE(tsp.can_advance, false))
                    OR (p_action = 'workflow.return' AND COALESCE(tsp.can_return, false))
              )
        ) INTO v_has_permission;
    END IF;

    IF v_has_permission THEN
        SELECT NOT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            JOIN public.role_action_restrictions rar ON rar.role_id = ur.role_id
            WHERE ur.user_id = p_user_id
              AND rar.module_code = p_module_code
              AND (rar.stage_code IS NULL OR rar.stage_code = p_stage_code)
              AND p_action = ANY(COALESCE(rar.denied_actions, ARRAY[]::text[]))
        ) INTO v_has_permission;
    END IF;

    RETURN COALESCE(v_has_permission, false);
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'check_matrix_permission failed: user=%, module=%, action=%, stage=%, error=%',
            p_user_id,
            p_module_code,
            p_action,
            p_stage_code,
            SQLERRM;
        RETURN false;
END;
$$;

COMMENT ON FUNCTION public.check_matrix_permission(uuid, text, text, text, uuid)
IS 'Single-source permission check. Grants come from role_module_permissions, ncr_stage_permissions, and task_stage_permissions only; department_module_access is not an authorization source.';

CREATE OR REPLACE FUNCTION public.check_user_permission(
    user_uuid uuid,
    p_module_code text,
    p_permission_code text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN public.check_matrix_permission(user_uuid, p_module_code, p_permission_code, NULL, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_user_perform_action(
    p_user_id uuid,
    p_module_code text,
    p_action text,
    p_stage_code text DEFAULT NULL::text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN public.check_matrix_permission(p_user_id, p_module_code, p_action, p_stage_code, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id uuid)
RETURNS SETOF public.user_effective_permission
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rmp.module_code,
        NULL::text AS stage_code,
        array_agg(DISTINCT action ORDER BY action) FILTER (WHERE action IS NOT NULL) AS granted_actions,
        COALESCE(am.data_isolation_mode, 'isolated')::text AS data_isolation_mode,
        ARRAY[]::uuid[] AS visibility_departments,
        NULL::uuid AS source_department_id,
        NULL::text AS source_department_name,
        bool_or(COALESCE(rmp.can_see_all_departments, false)) AS has_cross_dept_visibility
    FROM public.user_roles ur
    JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
    LEFT JOIN public.app_modules am ON am.code = rmp.module_code
    CROSS JOIN LATERAL unnest(COALESCE(rmp.granted_actions, ARRAY[]::text[])) AS action
    WHERE ur.user_id = p_user_id
    GROUP BY rmp.module_code, am.data_isolation_mode
    HAVING array_length(array_agg(DISTINCT action) FILTER (WHERE action IS NOT NULL), 1) > 0;
END;
$$;

COMMENT ON FUNCTION public.get_user_effective_permissions(uuid)
IS 'Role-first permission resolver. department_module_access is not an authorization source.';

CREATE OR REPLACE FUNCTION public.get_user_modules(p_user_id uuid)
RETURNS TABLE(
    module_code text,
    module_name text,
    module_name_ar text,
    granted_actions text[],
    data_isolation_mode text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        am.code,
        am.name,
        am.name_ar,
        array_agg(DISTINCT action ORDER BY action) FILTER (WHERE action IS NOT NULL) AS granted_actions,
        COALESCE(am.data_isolation_mode, 'isolated')::text AS data_isolation_mode
    FROM public.app_modules am
    JOIN public.role_module_permissions rmp ON rmp.module_code = am.code
    JOIN public.user_roles ur ON ur.role_id = rmp.role_id
    CROSS JOIN LATERAL unnest(COALESCE(rmp.granted_actions, ARRAY[]::text[])) AS action
    WHERE am.is_active = true
      AND ur.user_id = p_user_id
    GROUP BY am.code, am.name, am.name_ar, am.data_isolation_mode
    HAVING array_length(array_agg(DISTINCT action) FILTER (WHERE action IS NOT NULL), 1) > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_visible_departments(p_user_id uuid, p_module_code text)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_can_see_all boolean := false;
    v_departments uuid[];
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_module_permissions rmp ON rmp.role_id = ur.role_id
        WHERE ur.user_id = p_user_id
          AND rmp.module_code = p_module_code
          AND COALESCE(rmp.can_see_all_departments, false) = true
    ) INTO v_can_see_all;

    IF v_can_see_all THEN
        SELECT array_agg(id ORDER BY name) INTO v_departments
        FROM public.departments
        WHERE COALESCE(is_active, true) = true;
    ELSE
        SELECT array_agg(department_id) INTO v_departments
        FROM public.user_departments
        WHERE user_id = p_user_id
          AND is_active = true;
    END IF;

    RETURN COALESCE(v_departments, ARRAY[]::uuid[]);
END;
$$;

